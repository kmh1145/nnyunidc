<?php
namespace app\home\controller;

/**
 * @title 前台购物车
 * @description 接口说明：前台购物车
 */
class V10CartController extends CommonController
{
    public function auth()
    {
        $param = $this->request->param();
        $api_id = getZjmfApiIdByProductId($param["pid"]);
        $api = \think\Db::name("zjmf_finance_api")->where("id", $api_id)->find();
        if (empty($api)) {
            return json(["status" => 400, "msg" => "授权失败：接口不存在"]);
        }
        $url = rtrim($api["hostname"], "/");
        $login_url = $url . "/api/v1/auth";
        $login_data = ["username" => $api["username"], "password" => aesPasswordDecode($api["password"])];
        $result = zjmfApiLogin($api_id, $login_url, $login_data, true);
        if ($result["status"] == 200) {
            return json(["status" => 200, "msg" => "授权成功", "data" => ["jwt" => $result["jwt"], "url" => $url, "upstream_pid" => getUpstreamProductIdByProductId($param["pid"]), "currency" => \think\Db::name("currencies")->where("default", 1)->find(), "language_system" => configuration("language_system")]]);
        }
        return json($result);
    }
    public function configure()
    {
        $param = $this->request->param();
        $pid = $param["id"];
        $upstreamPid = getUpstreamProductIdByProductId($pid);
        unset($param["id"]);
        $param["is_downstream"] = 1;
        if (getZjmfApiProductTypeByProductId($pid) == "dcimcloud") {
            $result = zjmfCurl(getZjmfApiIdByProductId($pid), "/console/v1/product/" . $upstreamPid . "/mf_cloud/order_page", $param, 30, "GET");
        } else {
            $result = zjmfCurl(getZjmfApiIdByProductId($pid), "/console/v1/product/" . $upstreamPid . "/mf_dcim/order_page", $param, 30, "GET");
        }
        if ($result["status"] == 200) {
            $product = \think\Db::name("products")->where("id", $pid)->find();
            if (isset($result["data"]["backup_config"])) {
                foreach ($result["data"]["backup_config"] as &$item) {
                    $item["price"] = bcmul($item["price"], $product["upstream_price_value"] / 100, 2);
                }
            }
            if (isset($result["data"]["snap_config"])) {
                foreach ($result["data"]["snap_config"] as &$item) {
                    $item["price"] = bcmul($item["price"], $product["upstream_price_value"] / 100, 2);
                }
            }
        }
        return json($result);
    }
    public function image()
    {
        $param = $this->request->param();
        $pid = $param["id"];
        $upstreamPid = getUpstreamProductIdByProductId($pid);
        if (getZjmfApiProductTypeByProductId($pid) == "dcimcloud") {
            $result = zjmfCurl(getZjmfApiIdByProductId($pid), "/console/v1/product/" . $upstreamPid . "/mf_cloud/image", ["is_downstream" => 1], 30, "GET");
        } else {
            $result = zjmfCurl(getZjmfApiIdByProductId($pid), "/console/v1/product/" . $upstreamPid . "/mf_dcim/image", ["is_downstream" => 1], 30, "GET");
        }
        if ($result["status"] == 200) {
            $product = \think\Db::name("products")->where("id", $pid)->find();
            foreach ($result["data"]["list"] as &$item1) {
                foreach ($item1["image"] as &$item2) {
                    $item2["price"] = bcmul($item2["price"], $product["upstream_price_value"] / 100, 2);
                }
            }
        }
        return json($result);
    }
    public function duration()
    {
        $param = $this->request->param();
        $pid = $param["id"];
        $upstreamPid = getUpstreamProductIdByProductId($pid);
        if (getZjmfApiProductTypeByProductId($pid) == "dcimcloud") {
            $result = zjmfCurl(getZjmfApiIdByProductId($pid), "/console/v1/product/" . $upstreamPid . "/mf_cloud/duration", $param, 30, "POST");
        } else {
            $result = zjmfCurl(getZjmfApiIdByProductId($pid), "/console/v1/product/" . $upstreamPid . "/mf_dcim/duration", $param, 30, "POST");
        }
        if ($result["status"] == 200) {
            $product = \think\Db::name("products")->where("id", $pid)->find();
            foreach ($result["data"] as &$item) {
                $item["price"] = bcmul($item["price"] + ($item["discount"] ?? 0), $product["upstream_price_value"] / 100, 2);
            }
        }
        return json($result);
    }
    public function moduleCalculatePrice()
    {
        $param = $this->request->param();
        $pid = $param["id"];
        $upstreamPid = getUpstreamProductIdByProductId($pid);
        unset($param["id"]);
        $param["is_downstream"] = 1;
        $result = zjmfCurl(getZjmfApiIdByProductId($pid), "/console/v1/product/" . $upstreamPid . "/config_option", $param, 30, "POST");
        if ($result["status"] == 200) {
            $product = \think\Db::name("products")->where("id", $pid)->find();
            $result["data"]["price"] = bcmul($result["data"]["price"], $product["upstream_price_value"] / 100, 2);
            $result["data"]["base_price"] = $result["data"]["price"];
            $result["data"]["renew_price"] = bcmul($result["data"]["renew_price"], $product["upstream_price_value"] / 100, 2);
            foreach ($result["data"]["preview"] as &$item) {
                $item["price"] = bcmul($item["price"], $product["upstream_price_value"] / 100, 2);
            }
            $result["data"]["price_total"] = bcmul($result["data"]["price_total"], $product["upstream_price_value"] / 100, 2);
            $flag = getSaleProductUser($pid, request()->uid);
            if ($flag) {
                if ($flag["type"] == 1) {
                    $bates = bcdiv($flag["bates"], 100, 2);
                    $rebate = bcmul($result["data"]["price"], 1 - $bates, 2) < 0 ? 0 : bcmul($result["data"]["price"], 1 - $bates, 2);
                    $result["data"]["price"] = bcsub($result["data"]["price"], $rebate, 2) < 0 ? 0 : bcsub($result["data"]["price"], $rebate, 2);
                    $result["data"]["preview"][] = ["name" => "折扣", "price" => $rebate, "value" => "客户折扣"];
                } else if ($flag["type"] == 2) {
                    $bates = $flag["bates"];
                    $rebate = $result["data"]["price"] < $bates ? $result["data"]["price"] : $bates;
                    $result["data"]["price"] = bcsub($result["data"]["price"], $rebate, 2) < 0 ? 0 : bcsub($result["data"]["price"], $rebate, 2);
                    $result["data"]["preview"][] = ["name" => "折扣", "price" => $rebate, "value" => "客户折扣"];
                }
            }
        }
        return json($result);
    }
    public function addToCart()
    {
        $param = $this->request->param();
        $pid = $param["product_id"];
        $product = \think\Db::name("products")->field("host,password,name,is_truename,stock_control,qty,zjmf_api_id,upstream_pid,api_type")->where("id", $pid)->find();
        if (empty($product)) {
            return jsons(["status" => 400, "msg" => "商品不存在"]);
        }
        $param["product_id"] = $product["upstream_pid"];
        $result = zjmfCurl($product["zjmf_api_id"], "/console/v1/cart", $param, 30, "POST");
        if ($result["status"] != 200) {
            return json($result);
        }
        zjmfCurl($product["zjmf_api_id"], "/console/v1/cart", [], 30, "DELETE");
        $uid = request()->uid;
        $shop = new \app\common\logic\Shop($uid);
        $shop->v10AddCart(["pid" => $pid, "qty" => $param["upstream_product"]["qty"] ?? 1, "billingcycle" => "monthly", "configoptions" => [], "allow_qty" => 0, "upstream_product" => $param]);
        return jsons(["status" => 200, "msg" => lang("ADD SUCCESS")]);
    }
    public function editToCartPage()
    {
        $param = $this->request->param();
        $i = $param["i"] ?? 0;
        unset($param["i"]);
        $uid = request()->uid;
        $shop = new \app\common\logic\Shop($uid);
        $config = $shop->v10EditCartPage($i);
        return jsons(["status" => 200, "msg" => lang("SUCCESS MESSAGE"), "data" => ["edit" => $config]]);
    }
    public function editToCart()
    {
        $param = $this->request->param();
        $i = $param["i"] ?? 0;
        unset($param["i"]);
        $pid = $param["product_id"] ?? 0;
        $product = \think\Db::name("products")->field("host,password,name,is_truename,stock_control,qty,zjmf_api_id,upstream_pid,api_type")->where("id", $pid)->find();
        if (empty($product)) {
            return jsons(["status" => 400, "msg" => "商品不存在"]);
        }
        $param["product_id"] = $product["upstream_pid"];
        $result = zjmfCurl($product["zjmf_api_id"], "/console/v1/cart", $param, 30, "POST");
        if ($result["status"] != 200) {
            return json($result);
        }
        zjmfCurl($product["zjmf_api_id"], "/console/v1/cart", [], 30, "DELETE");
        $uid = request()->uid;
        $shop = new \app\common\logic\Shop($uid);
        $shop->v10EditCart($i, ["pid" => $pid, "qty" => $param["upstream_product"]["qty"] ?? 1, "billingcycle" => "monthly", "configoptions" => [], "allow_qty" => 0, "upstream_product" => $param]);
        return jsons(["status" => 200, "msg" => lang("EDIT SUCCESS")]);
    }
    public function v10HostDetail()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $result = zjmfCurl($apiId, "/console/v1/host/" . $host["dcimid"], $param, 30, "GET");
        if ($result["status"] == 200) {
            $result["data"]["host"]["product_id"] = $host["productid"];
            $result["data"]["host"]["first_payment_amount"] = $host["firstpaymentamount"];
            $result["data"]["host"]["renew_amount"] = $host["amount"];
            $cancel_data = \think\Db::name("cancel_requests")->where("relid", $param["id"] ?? 0)->where("delete_time", 0)->find();
            $product = \think\Db::name("products")->field("cancel_control")->find($host["productid"]);
            if (in_array($host["domainstatus"], ["Active", "Suspended"]) && $product["cancel_control"]) {
                $result["data"]["product"]["cancel_control"] = 1;
            } else {
                $result["data"]["product"]["cancel_control"] = 0;
            }
            $result["data"]["product"]["is_cancel"] = !empty($cancel_data);
            $result["data"]["product"]["remark"] = $host["remark"] ?? "";
            $result["data"]["host"]["ratio_renew"] = $host["initiative_renew"] ?? 0;
        }
        return jsons($result);
    }
    public function v10HostList()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $type = getZjmfApiProductTypeByProductId($host["productid"]);
        if ($type == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/host", $param, 30, "GET");
        } else if ($type == "cloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/host", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/idcsmart_common/host", $param, 30, "GET");
        }
        if ($result["status"] == 200) {
            $upstreamHostIds = \think\Db::name("host")->alias("h")->field("h.id,h.dcimid")->leftJoin("products p", "h.productid=p.id")->leftJoin("zjmf_finance_api z", "z.id=p.zjmf_api_id")->where("h.uid", request()->uid)->where("z.type", "v10")->select()->toArray();
            $list = [];
            foreach ($result["data"]["list"] as $item) {
                foreach ($upstreamHostIds as $hostId) {
                    if ($item["id"] == $hostId["dcimid"]) {
                        $item["id"] = $hostId["id"];
                        $list[] = $item;
                    }
                }
            }
            $result["data"]["list"] = $list;
            $result["data"]["count"] = count($list);
        }
        return jsons($result);
    }
    public function v10HostView()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $result = zjmfCurl($apiId, "/console/v1/host/" . $host["dcimid"] . "/view", $param, 30, "GET");
        return jsons($result);
    }
    public function v10MfCloudDetail()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"], $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"], $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10MfCloudPart()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/part", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/part", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10MfCloudOn()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/on", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/on", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudOff()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/off", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/off", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudReboot()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/reboot", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/reboot", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudHardOff()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/hard_off", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/hard_off", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudHardReboot()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/hard_reboot", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/hard_reboot", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudVnc()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $param["more"] = 1;
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/vnc", $param, 30, "POST");
            if ($result["status"] == 200) {
                $arr = parse_url($result["data"]["url"]);
                $cache = ["vnc_url" => $result["data"]["vnc_url"], "vnc_pass" => $result["data"]["vnc_pass"], "password" => $result["data"]["password"], "token" => $result["data"]["token"]];
                if (request()->scheme() == "https") {
                    $ws = "wss";
                } else {
                    $ws = "ws";
                }
                $parseUrl = parse_url($cache["vnc_url"]);
                $cache["vnc_url"] = $ws . "://" . $parseUrl["host"] . ":" . $parseUrl["port"] . $parseUrl["path"] . "?" . $parseUrl["query"];
                \think\facade\Cache::set("mf_cloud_vnc_" . $host["id"], $cache, 1800);
                $result["data"]["url"] = request()->domain() . "/v10/host/mf_cloud/" . $host["id"] . "/vnc?" . $arr["query"];
            }
        } else {
            $param["more"] = 1;
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/vnc", $param, 30, "POST");
            if ($result["status"] == 200) {
                $arr = parse_url($result["data"]["url"]);
                $cache = ["vnc_url" => $result["data"]["vnc_url"], "vnc_pass" => $result["data"]["vnc_pass"], "password" => $result["data"]["password"], "token" => $result["data"]["token"]];
                if (request()->scheme() == "https") {
                    $ws = "wss";
                } else {
                    $ws = "ws";
                }
                $parseUrl = parse_url($cache["vnc_url"]);
                $cache["vnc_url"] = $ws . "://" . $parseUrl["host"] . ":" . $parseUrl["port"] . $parseUrl["path"] . "?" . $parseUrl["query"];
                \think\facade\Cache::set("mf_dcim_vnc_" . $host["id"], $cache, 1800);
                $result["data"]["url"] = request()->domain() . "/v10/host/mf_dcim/" . $host["id"] . "/vnc?" . $arr["query"];
            }
        }
        return jsons($result);
    }
    public function v10MfCloudVncPage()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $cache = \think\facade\Cache::get("mf_cloud_vnc_" . $param["id"]);
            if (!empty($cache) && isset($param["tmp_token"]) && $param["tmp_token"] === $cache["token"]) {
                header("location:/cloud/vnc?id=" . $param["id"]);
                exit;
            }
            echo "token已过期";
            exit;
        }
        $cache = \think\facade\Cache::get("mf_dcim_vnc_" . $param["id"]);
        if (!empty($cache) && isset($param["tmp_token"]) && $param["tmp_token"] === $cache["token"]) {
            header("location:/dcim/vnc?id=" . $param["id"]);
            exit;
        }
        echo "token已过期";
        exit;
    }
    public function v10MfCloudStatus()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/status", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/status", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10MfCloudResetPassword()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/reset_password", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/reset_password", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudRescue()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/rescue", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/rescue", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudExit()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/rescue/exit", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/rescue/exit", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudReinstall()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/reinstall", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/reinstall", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudChart()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/chart", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/chart", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10MfCloudFlow()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/flow", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/flow", $param, 30, "GET");
        }
        $flowPlugin = zjmfCurl($apiId, "/console/v1/host/" . $host["dcimid"] . "/flow_packet", $param, 30, "GET");
        if ($flowPlugin["status"] == 200 && $result["status"] == 200) {
            $result["data"]["flow_plugin"] = true;
        }
        return jsons($result);
    }
    public function v10MfCloudFlowPacket()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $product = \think\Db::name("products")->find($host["productid"]);
        $result = zjmfCurl($apiId, "/console/v1/host/" . $host["dcimid"] . "/flow_packet", $param, 30, "GET");
        foreach ($result["data"]["list"] as &$v) {
            $v["price"] = bcmul($v["price"] + ($v["discount"] ?? 0), $product["upstream_price_value"] / 100, 2);
        }
        return jsons($result);
    }
    public function v10MfCloudDisk()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/disk", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/disk", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10MfCloudDiskUnmount()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/disk/" . $param["disk_id"] . "/unmount", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/disk/" . $param["disk_id"] . "/unmount", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudDiskMount()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/disk/" . $param["disk_id"] . "/mount", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/disk/" . $param["disk_id"] . "/mount", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudSnapshot()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/snapshot", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/snapshot", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10MfCloudSnapshotCreate()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/snapshot", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/snapshot", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudSnapshotRestore()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/snapshot/restore", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/snapshot/restore", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudSnapshotDelete()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/snapshot/" . $param["snapshot_id"], $param, 30, "DELETE");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/snapshot/" . $param["snapshot_id"], $param, 30, "DELETE");
        }
        return jsons($result);
    }
    public function v10MfCloudBackup()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/backup", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/backup", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10MfCloudBackupCreate()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/backup", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/backup", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudBackupRestore()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/backup/restore", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/backup/restore", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudBackupDelete()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/backup/" . $param["backup_id"], $param, 30, "DELETE");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/backup/" . $param["backup_id"], $param, 30, "DELETE");
        }
        return jsons($result);
    }
    public function v10MfCloudLog()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/log", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/log", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10MfCloudRemoteInfo()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/remote_info", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/remote_info", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10MfCloudIp()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/ip", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/ip", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10MfCloudVpcNetwork()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/vpc_network", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/vpc_network", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudVpcNetworkList()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/vpc_network", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/vpc_network", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10MfCloudVpcNetworkPut()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/vpc_network/" . $param["vpc_network_id"], $param, 30, "PUT");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/vpc_network/" . $param["vpc_network_id"], $param, 30, "PUT");
        }
        return jsons($result);
    }
    public function v10MfCloudVpcNetworkDelete()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/vpc_network/" . $param["vpc_network_id"], $param, 30, "DELETE");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/vpc_network/" . $param["vpc_network_id"], $param, 30, "DELETE");
        }
        return jsons($result);
    }
    public function v10MfCloudVpcNetworkChange()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/vpc_network", $param, 30, "PUT");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/vpc_network", $param, 30, "PUT");
        }
        return jsons($result);
    }
    public function v10MfCloudRealData()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/real_data", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/real_data", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10MfCloudLine()
    {
        $param = $this->request->param();
        if (getZjmfApiProductTypeByProductId($param["product_id"]) == "dcimcloud") {
            $result = zjmfCurl(getZjmfApiIdByProductId($param["product_id"]), "/console/v1/product/" . $param["product_id"] . "/mf_cloud/line/" . $param["line_id"], $param, 30, "GET");
        } else {
            $result = zjmfCurl(getZjmfApiIdByProductId($param["product_id"]), "/console/v1/product/" . $param["product_id"] . "/mf_dcim/line/" . $param["line_id"], $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10MfCloudNatAcl()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/nat_acl", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/nat_acl", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10MfCloudNatAclPost()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/nat_acl", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/nat_acl", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudNatAclDelete()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/nat_acl", $param, 30, "DELETE");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/nat_acl", $param, 30, "DELETE");
        }
        return jsons($result);
    }
    public function v10MfCloudNatWeb()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/nat_web", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/nat_web", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10MfCloudNatWebPost()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/nat_web", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/nat_web", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudNatWebDelete()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/nat_web", $param, 30, "DELETE");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/nat_web", $param, 30, "DELETE");
        }
        return jsons($result);
    }
    public function v10MfCloudSshKey()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $result = zjmfCurl($apiId, "/console/v1/ssh_key", $param, 30, "GET");
        return jsons($result);
    }
    public function v10RenewPage()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $result = zjmfCurl($apiId, "/console/v1/host/" . $host["dcimid"] . "/renew", [], 30, "GET");
        if ($result["status"] == 200) {
            $product = \think\Db::name("products")->find($host["productid"]);
            $flag = getSaleProductUser($host["productid"], $host["uid"]);
            $billingcycle = config("coupon_cycle_promo")[$host["billingcycle"]] ?? $host["billingcycle"];
            foreach ($result["data"]["host"] as &$item) {
                if (strpos($billingcycle, $item["billing_cycle"]) !== false || strpos($item["billing_cycle"], $billingcycle) !== false) {
                    $item["price"] = bcmul($host["amount"], 1, 2);
                } else {
                    $item["price"] = bcmul($item["price"] + ($item["discount"] ?? 0), $product["upstream_price_value"] / 100, 2);
                    if ($flag) {
                        if ($flag["type"] == 1) {
                            $item["price"] = bcmul($item["price"], $flag["bates"] / 100, 2);
                        } else if ($flag["type"] == 2) {
                            $item["price"] = 0 < bcsub($item["price"], $flag["bates"], 2) ? bcsub($item["price"], $flag["bates"], 2) : 0;
                        }
                    }
                }
            }
        }
        return jsons($result);
    }
    public function v10MfCloudDiskPrice()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $param["is_downstream"] = 1;
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/disk/price", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/disk/price", $param, 30, "POST");
        }
        if ($result["status"] == 200) {
            $product = \think\Db::name("products")->find($host["productid"]);
            $result["data"]["price"] = bcmul($result["data"]["price"], $product["upstream_price_value"] / 100, 2);
            $result["data"]["price_difference"] = bcmul($result["data"]["price_difference"], $product["upstream_price_value"] / 100, 2);
            $result["data"]["renew_price_difference"] = bcmul($result["data"]["renew_price_difference"], $product["upstream_price_value"] / 100, 2);
        }
        return jsons($result);
    }
    public function v10MfCloudDiskResize()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $param["is_downstream"] = 1;
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/disk/resize", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/disk/resize", $param, 30, "POST");
        }
        if ($result["status"] == 200) {
            $product = \think\Db::name("products")->find($host["productid"]);
            $result["data"]["price"] = bcmul($result["data"]["price"], $product["upstream_price_value"] / 100, 2);
            $result["data"]["price_difference"] = bcmul($result["data"]["price_difference"], $product["upstream_price_value"] / 100, 2);
            $result["data"]["renew_price_difference"] = bcmul($result["data"]["renew_price_difference"], $product["upstream_price_value"] / 100, 2);
        }
        return jsons($result);
    }
    public function v10MfCloudBackupConfig()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $param["is_downstream"] = 1;
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/backup_config", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/backup_config", $param, 30, "GET");
        }
        if ($result["status"] == 200) {
            $product = \think\Db::name("products")->find($host["productid"]);
            $result["data"]["price"] = bcmul($result["data"]["price"], $product["upstream_price_value"] / 100, 2);
            $result["data"]["price_difference"] = bcmul($result["data"]["price_difference"], $product["upstream_price_value"] / 100, 2);
            $result["data"]["renew_price_difference"] = bcmul($result["data"]["renew_price_difference"], $product["upstream_price_value"] / 100, 2);
        }
        return jsons($result);
    }
    public function v10MfCloudIpNum()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $param["is_downstream"] = 1;
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/ip_num", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/ip_num", $param, 30, "GET");
        }
        if ($result["status"] == 200) {
            $product = \think\Db::name("products")->find($host["productid"]);
            $result["data"]["price"] = bcmul($result["data"]["price"], $product["upstream_price_value"] / 100, 2);
            $result["data"]["price_difference"] = bcmul($result["data"]["price_difference"], $product["upstream_price_value"] / 100, 2);
            $result["data"]["renew_price_difference"] = bcmul($result["data"]["renew_price_difference"], $product["upstream_price_value"] / 100, 2);
        }
        return jsons($result);
    }
    public function v10MfCloudImageCheck()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $param["is_downstream"] = 1;
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/image/check", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/image/check", $param, 30, "GET");
        }
        if ($result["status"] == 200) {
            $product = \think\Db::name("products")->find($host["productid"]);
            $result["data"]["price"] = bcmul($result["data"]["price"], $product["upstream_price_value"] / 100, 2);
            $result["data"]["price_difference"] = bcmul($result["data"]["price_difference"], $product["upstream_price_value"] / 100, 2);
            $result["data"]["renew_price_difference"] = bcmul($result["data"]["renew_price_difference"], $product["upstream_price_value"] / 100, 2);
        }
        return jsons($result);
    }
    public function v10MfCloudCommonConfig()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $param["is_downstream"] = 1;
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/common_config", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/common_config", $param, 30, "GET");
        }
        if ($result["status"] == 200) {
            $product = \think\Db::name("products")->find($host["productid"]);
            $result["data"]["price"] = bcmul($result["data"]["price"], $product["upstream_price_value"] / 100, 2);
            $result["data"]["price_difference"] = bcmul($result["data"]["price_difference"], $product["upstream_price_value"] / 100, 2);
            $result["data"]["renew_price_difference"] = bcmul($result["data"]["renew_price_difference"], $product["upstream_price_value"] / 100, 2);
        }
        return jsons($result);
    }
    public function v10MfCloudRecommendConfig()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $param["is_downstream"] = 1;
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/recommend_config", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/recommend_config", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10MfCloudRecommendConfigPrice()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $param["is_downstream"] = 1;
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/recommend_config/price", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/recommend_config/price", $param, 30, "GET");
        }
        if ($result["status"] == 200) {
            $product = \think\Db::name("products")->find($host["productid"]);
            $result["data"]["price"] = bcmul($result["data"]["price"], $product["upstream_price_value"] / 100, 2);
            $result["data"]["price_difference"] = bcmul($result["data"]["price_difference"], $product["upstream_price_value"] / 100, 2);
            $result["data"]["renew_price_difference"] = bcmul($result["data"]["renew_price_difference"], $product["upstream_price_value"] / 100, 2);
        }
        return jsons($result);
    }
    public function v10MfCloudUpgradeOrder()
    {
        $param = $this->request->param();
        $hid = $param["id"] ?? 0;
        $host = \think\Db::name("host")->alias("h")->field("concat(pg.name, \"-\" , p.name) as name,p.name as pname,h.uid,h.regdate,h.billingcycle,h.flag,h.id,h.dcimid,h.productid,\r\n            p.pay_type,h.firstpaymentamount,h.amount,h.domain,h.nextduedate,h.payment,p.id as pid,p.down_configoption_refund,p.api_type,p.upstream_price_type,p.upstream_price_value,p.upstream_pid")->leftJoin("products p", "h.productid = p.id")->leftJoin("product_groups pg", "pg.id = p.gid")->where("h.id", $hid)->find();
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $uid = $host["uid"];
        $payment = "";
        $gateways = array_column(gateway_list(), "name");
        if (!in_array($payment, $gateways)) {
            $payment = $gateways[0];
        }
        $currencyid = isset($param["currencyid"]) ? intval($param["currencyid"]) : "";
        $currencyid = priorityCurrency($uid, $currencyid);
        list($currency) = (new \app\common\logic\Currencies())->getCurrencies("id,code,prefix,suffix", $currencyid);
        $product_name = $host["pname"];
        $upgradeType = $param["upgrade_type"];
        $param["is_downstream"] = 1;
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            if ($upgradeType == "common_config") {
                $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/common_config", $param, 30, "GET");
            } else if ($upgradeType == "backup_config") {
                $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/backup_config", $param, 30, "GET");
            } else if ($upgradeType == "disk") {
                $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/disk/resize", $param, 30, "POST");
            } else if ($upgradeType == "new_disk") {
                $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/disk/price", $param, 30, "POST");
            } else if ($upgradeType == "image") {
                $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/image/check", $param, 30, "GET");
            } else if ($upgradeType == "ip_num") {
                $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/ip_num", $param, 30, "GET");
            } else if ($upgradeType == "flow_packet") {
                $result = zjmfCurl($apiId, "/console/v1/host/" . $host["dcimid"] . "/flow_packet", $param, 30, "GET");
            } else if ($upgradeType == "recommend_config") {
                $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/recommend_config/price", $param, 30, "GET");
            }
        } else if ($upgradeType == "common_config") {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/common_config", $param, 30, "GET");
        } else if ($upgradeType == "backup_config") {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/backup_config", $param, 30, "GET");
        } else if ($upgradeType == "disk") {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/disk/resize", $param, 30, "POST");
        } else if ($upgradeType == "new_disk") {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/disk/price", $param, 30, "POST");
        } else if ($upgradeType == "image") {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/image/check", $param, 30, "GET");
        } else if ($upgradeType == "ip_num") {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/ip_num", $param, 30, "GET");
        } else if ($upgradeType == "flow_packet") {
            $result = zjmfCurl($apiId, "/console/v1/host/" . $host["dcimid"] . "/flow_packet", $param, 30, "GET");
        }
        if ($result["status"] != 200) {
            $result["status"] = 400;
            $result["msg"] = $result["msg"] ?? "请求错误";
            return jsons($result);
        }
        $total = 0;
        $new_description = "";
        $renew_price_difference = 0;
        if ($result["status"] == 200) {
            $product = \think\Db::name("products")->find($host["productid"]);
            if ($upgradeType == "flow_packet") {
                foreach ($result["data"]["list"] as $v) {
                    if ($param["flow_packet_id"] == $v["id"]) {
                        $result["data"]["price"] = bcmul($v["price"], $product["upstream_price_value"] / 100, 2);
                        $total = $result["data"]["price"];
                        $new_description = $v["name"] . "流量包";
                    }
                }
            } else {
                $result["data"]["price"] = bcmul($result["data"]["price"], $product["upstream_price_value"] / 100, 2);
                $total = $result["data"]["price"];
                $result["data"]["price_difference"] = bcmul($result["data"]["price_difference"] ?? 0, $product["upstream_price_value"] / 100, 2);
                $result["data"]["renew_price_difference"] = bcmul($result["data"]["renew_price_difference"] ?? 0, $product["upstream_price_value"] / 100, 2);
                $renew_price_difference = $result["data"]["renew_price_difference"];
                if ($upgradeType == "new_disk") {
                    $renew_price_difference = $total;
                }
                $new_description = $result["data"]["description"] ?? "";
            }
        }
        $Upgrade = new \app\common\logic\Upgrade();
        \think\Db::startTrans();
        try {
            $Upgrade->deleteUpgradeInvoices($param["id"]);
            $order_data = ["uid" => $uid, "ordernum" => cmf_get_order_sn(), "status" => "Pending", "create_time" => time(), "amount" => $total <= 0 ? 0 : $total, "promo_code" => "", "promo_type" => "", "promo_value" => "", "payment" => $payment];
            $invoice_data = ["uid" => $uid, "create_time" => time(), "due_time" => time(), "subtotal" => $total <= 0 ? 0 : $total, "credit" => "", "total" => $total <= 0 ? 0 : $total, "status" => $total <= 0 ? "Paid" : "Unpaid", "payment" => $payment, "type" => "upgrade", "url" => "servicedetail?id=" . $hid];
            if (0 < $total) {
                $invoice_id = \think\Db::name("invoices")->insertGetId($invoice_data);
            } else {
                $invoice_id = 0;
            }
            $order_data["invoiceid"] = $invoice_id;
            $orderid = \think\Db::name("orders")->insertGetId($order_data);
            $upgrade_data = ["uid" => $uid, "order_id" => $orderid, "type" => "configoptions", "date" => time(), "relid" => $hid, "original_value" => "", "new_value" => json_encode($param), "new_cycle" => "", "amount" => $total, "credit_amount" => "", "days_remaining" => "", "total_days_in_cycle" => "", "new_recurring_amount" => "", "recurring_change" => $renew_price_difference, "status" => "Pending", "paid" => "N", "description" => "产品配置项升降级：" . $host["pname"] . ":" . $new_description];
            $upgrade_id = \think\Db::name("upgrades")->insertGetId($upgrade_data);
            $invoice_items_data[] = ["invoice_id" => $invoice_id, "uid" => $uid, "type" => "upgrade", "rel_id" => intval($upgrade_id), "description" => "产品配置项升降级：" . $host["pname"] . ":" . $new_description, "amount" => $total, "due_time" => time(), "payment" => $payment];
            \think\Db::name("invoice_items")->insertAll($invoice_items_data);
            $str = "";
            if (0 < $total) {
                $str .= " 可配置项升级成功";
            } else {
                $str .= " 可配置项降级成功";
            }
            active_log_final(sprintf("%s#User ID:%d - #Host ID:%d", $str, $uid, $hid), $uid, 2, $hid);
            \think\Db::commit();
            $res = ["status" => 200, "msg" => "结算成功"];
        } catch (\Exception $e) {
            \think\Db::rollback();
            $res = ["status" => 400, "msg" => lang("CHECKOUT FAIL") . $e->getMessage()];
        }
        if ($res["status"] != 200) {
            return jsons($res);
        }
        if ($total <= 0) {
            $credit_refund = -1 * $total;
            if (configuration("upgrade_down_product_config") && 0 < $credit_refund) {
                \think\Db::startTrans();
                try {
                    $invoice_refund = ["uid" => $uid, "create_time" => time(), "due_time" => time(), "subtotal" => $credit_refund, "credit" => "", "total" => $credit_refund, "status" => "Refunded", "payment" => $payment, "type" => "upgrade", "url" => "servicedetail?id=" . $hid];
                    $invoice_refund_id = \think\Db::name("invoices")->insertGetId($invoice_refund);
                    $account1 = ["uid" => $uid, "currency" => $currency, "gateway" => $payment, "create_time" => time(), "pay_time" => time(), "amount_in" => $credit_refund, "fees" => "", "amount_out" => 0, "rate" => 1, "trans_id" => "", "invoice_id" => $invoice_refund_id, "refund" => 0, "description" => "产品'" . $product_name . "'降级退款,充值至余额"];
                    $aid = \think\Db::name("accounts")->insertGetId($account1);
                    $account2 = ["uid" => $uid, "currency" => $currency, "gateway" => $payment, "create_time" => time(), "pay_time" => time(), "amount_in" => 0, "fees" => "", "amount_out" => $credit_refund, "rate" => 1, "trans_id" => "", "invoice_id" => $invoice_refund_id, "refund" => $aid, "description" => "产品'" . $product_name . "'降级退款"];
                    \think\Db::name("accounts")->insert($account2);
                    $invoice_refund_item = ["invoice_id" => $invoice_refund_id, "uid" => $uid, "type" => "upgrade", "rel_id" => 0, "description" => "产品配置项降级：" . $host["pname"] . ":" . $new_description, "amount" => $credit_refund, "due_time" => time(), "payment" => $payment];
                    \think\Db::name("invoice_items")->insert($invoice_refund_item);
                    \think\Db::name("clients")->where("id", $uid)->setInc("credit", $credit_refund);
                    credit_log(["uid" => $uid, "desc" => 0 < $credit_refund ? "降级退款至余额" : "减少余额", "amount" => $credit_refund, "relid" => $invoice_id]);
                    \think\Db::commit();
                } catch (\Exception $e) {
                    \think\Db::rollback();
                }
            } else {
                $invoice_refund = ["uid" => $uid, "create_time" => time(), "due_time" => time(), "subtotal" => 0, "credit" => "", "total" => 0, "status" => $total == 0 ? "Paid" : "Refunded", "payment" => $payment, "type" => "upgrade", "url" => "servicedetail?id=" . $hid];
                $invoice_refund_id = \think\Db::name("invoices")->insertGetId($invoice_refund);
                $invoice_refund_item = ["invoice_id" => $invoice_refund_id, "uid" => $uid, "type" => "upgrade", "rel_id" => 0, "description" => "产品配置项降级：" . $host["pname"] . ":" . $new_description, "amount" => 0, "due_time" => time(), "payment" => $payment];
                \think\Db::name("invoice_items")->insert($invoice_refund_item);
            }
            $Upgrade->doUpgrade($upgrade_id);
            return jsons(["status" => 1001, "msg" => lang("BUY SUCCESS"), "data" => ["orderid" => $orderid]]);
        }
        $response_data["invoiceid"] = $invoice_id;
        $response_data["orderid"] = $orderid;
        return jsons(["status" => 200, "data" => $response_data]);
    }
    public function v10HostAutoRenewPage()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        return jsons(["status" => 200, "msg" => lang("SUCCESS MESSAGE"), "data" => ["status" => $host["initiative_renew"]]]);
    }
    public function v10HostAutoRenew()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        \think\Db::name("host")->where("id", $param["id"])->update(["initiative_renew" => $param["status"] ?? 0]);
        return jsons(["status" => 200, "msg" => lang("SUCCESS MESSAGE")]);
    }
    public function v10HostRefundPage()
    {
        $param = $this->request->param();
        $id = $param["id"] ?? 0;
        $host = \think\Db::name("host")->find($id);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $cancel_data = \think\Db::name("cancel_requests")->where("relid", $id)->where("delete_time", 0)->find();
        $data = ["domainstatus" => $host["domainstatus"], "is_cancel" => !empty($cancel_data)];
        return jsons(["status" => 200, "msg" => lang("SUCCESS MESSAGE"), "data" => $data]);
    }
    public function v10HostNotes()
    {
        $param = $this->request->param();
        $id = $param["id"] ?? 0;
        $host = \think\Db::name("host")->find($id);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $result = zjmfCurl($apiId, "/console/v1/host/" . $host["dcimid"] . "/notes", $param, 30, "PUT");
        if ($result["status"] == 200) {
            \think\Db::name("host")->where("id", $id)->update(["remark" => $param["notes"]]);
        }
        return jsons($result);
    }
    public function v10DataCenter()
    {
        $param = $this->request->param();
        $apiId = getZjmfApiIdByProductId($param["id"]);
        $upstreamPid = getUpstreamProductIdByProductId($param["id"]);
        if (getZjmfApiProductTypeByProductId($param["id"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/product/" . $upstreamPid . "/mf_cloud/data_center", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/product/" . $upstreamPid . "/mf_dcim/data_center", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10ValidateSettle()
    {
        $param = $this->request->param();
        $apiId = getZjmfApiIdByProductId($param["id"]);
        $upstreamPid = getUpstreamProductIdByProductId($param["id"]);
        if (getZjmfApiProductTypeByProductId($param["id"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/product/" . $upstreamPid . "/mf_cloud/validate_settle", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/product/" . $upstreamPid . "/mf_dcim/validate_settle", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10PhoneCode()
    {
        $param = $this->request->param();
        $id = $param["id"] ?? 0;
        $host = \think\Db::name("host")->find($id);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $client = \think\Db::name("clients")->where("id", $host["uid"])->find();
        $param = ["action" => "verify", "phone_code" => $client["phone_code"], "phone" => $client["phonenumber"]];
        $result = zjmfCurl($apiId, "/console/v1/phone/code", $param, 30, "POST");
        return jsons($result);
    }
    public function v10MfCloudVpcNetworkListSearch()
    {
        $param = $this->request->param();
        $apiId = getZjmfApiIdByProductId($param["id"]);
        $upstreamPid = getUpstreamProductIdByProductId($param["id"]);
        if (getZjmfApiProductTypeByProductId($param["id"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/product/" . $upstreamPid . "/mf_cloud/vpc_network/search", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/product/" . $upstreamPid . "/mf_dcim/vpc_network/search", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10MfCloudPackage()
    {
        $param = $this->request->param();
        $apiId = getZjmfApiIdByProductId($param["id"]);
        $upstreamPid = getUpstreamProductIdByProductId($param["id"]);
        if (getZjmfApiProductTypeByProductId($param["id"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/product/" . $upstreamPid . "/mf_cloud/package", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/product/" . $upstreamPid . "/mf_dcim/package", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function selfDefinedField()
    {
        $param = $this->request->param();
        $apiId = getZjmfApiIdByProductId($param["id"]);
        $upstreamPid = getUpstreamProductIdByProductId($param["id"]);
        $result = zjmfCurl($apiId, "/console/v1/product/" . $upstreamPid . "/self_defined_field/order_page", $param, 30, "GET");
        return jsons($result);
    }
    public function v10IdcsmartCommonConfigoption()
    {
        $param = $this->request->param();
        $apiId = getZjmfApiIdByProductId($param["id"]);
        $upstreamPid = getUpstreamProductIdByProductId($param["id"]);
        $result = zjmfCurl($apiId, "/console/v1/idcsmart_common/product/" . $upstreamPid . "/configoption", $param, 30, "GET");
        return json($result);
    }
    public function v10IdcsmartCommonCalculate()
    {
        $param = $this->request->param();
        $apiId = getZjmfApiIdByProductId($param["id"]);
        $upstreamPid = getUpstreamProductIdByProductId($param["id"]);
        $result = zjmfCurl($apiId, "/console/v1/idcsmart_common/product/" . $upstreamPid . "/configoption/calculate", $param, 30, "POST");
        return json($result);
    }
    public function v10IdcsmartCommonHostConfigoption()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $result = zjmfCurl($apiId, "/console/v1/idcsmart_common/host/" . $host["dcimid"] . "/configoption", $param, 30, "GET");
        if ($result["status"] == 200 && isset($result["data"]["client_area"]) && !empty($result["data"]["client_area"])) {
            $filter = [];
            foreach ($result["data"]["client_area"] as $item) {
                if ($item["key"] != "security_group") {
                    $filter[] = $item;
                }
            }
            $result["data"]["client_area"] = $filter;
        }
        return json($result);
    }
    public function v10IdcsmartCommonHostChart()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $result = zjmfCurl($apiId, "/console/v1/idcsmart_common/host/" . $host["dcimid"] . "/configoption/chart", $param, 30, "POST");
        return json($result);
    }
    public function v10IdcsmartCommonHostProvision()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $param["id"] = $host["dcimid"];
        $result = zjmfCurl($apiId, "/console/v1/idcsmart_common/host/" . $host["dcimid"] . "/provision/" . $param["func"], $param, 30, "POST");
        if ($result["status"] == 200) {
            if ($param["func"] == "on") {
                active_log_final(sprintf("模块命令:开机成功#Host ID:%d", $host["id"]), $host["uid"], 2, $host["id"]);
            } else if ($param["func"] == "off") {
                active_log_final(sprintf("模块命令:关机成功#Host ID:%d", $host["id"]), $host["uid"], 2, $host["id"]);
            } else if ($param["func"] == "reboot") {
                active_log_final(sprintf("模块命令:重启成功#Host ID:%d", $host["id"]), $host["uid"], 2, $host["id"]);
            } else if ($param["func"] == "hard_off") {
                active_log_final(sprintf("模块命令:硬关机成功#Host ID:%d", $host["id"]), $host["uid"], 2, $host["id"]);
            } else if ($param["func"] == "hard_reboot") {
                active_log_final(sprintf("模块命令:硬重启成功#Host ID:%d", $host["id"]), $host["uid"], 2, $host["id"]);
            } else if ($param["func"] == "vnc") {
                active_log_final(sprintf("模块命令:打开vnc成功#Host ID:%d", $host["id"]), $host["uid"], 2, $host["id"]);
            } else if ($param["func"] == "reinstall") {
                active_log_final(sprintf("模块命令:重装系统成功#Host ID:%d", $host["id"]), $host["uid"], 2, $host["id"]);
            } else if ($param["func"] == "crack_pass") {
                active_log_final(sprintf("模块命令:重置密码成功#Host ID:%d", $host["id"]), $host["uid"], 2, $host["id"]);
            }
        } else if ($param["func"] == "on") {
            active_log_final(sprintf("模块命令:开机失败#Host ID:%d - 原因:%s", $host["id"], $result["msg"]), $host["uid"], 2, $host["id"]);
        } else if ($param["func"] == "off") {
            active_log_final(sprintf("模块命令:关机失败#Host ID:%d - 原因:%s", $host["id"], $result["msg"]), $host["uid"], 2, $host["id"]);
        } else if ($param["func"] == "reboot") {
            active_log_final(sprintf("模块命令:重启失败#Host ID:%d - 原因:%s", $host["id"], $result["msg"]), $host["uid"], 2, $host["id"]);
        } else if ($param["func"] == "hard_off") {
            active_log_final(sprintf("模块命令:硬关机失败#Host ID:%d - 原因:%s", $host["id"], $result["msg"]), $host["uid"], 2, $host["id"]);
        } else if ($param["func"] == "hard_reboot") {
            active_log_final(sprintf("模块命令:硬重启失败#Host ID:%d - 原因:%s", $host["id"], $result["msg"]), $host["uid"], 2, $host["id"]);
        } else if ($param["func"] == "vnc") {
            active_log_final(sprintf("模块命令:打开vnc失败#Host ID:%d - 原因:%s", $host["id"], $result["msg"]), $host["uid"], 2, $host["id"]);
        } else if ($param["func"] == "reinstall") {
            active_log_final(sprintf("模块命令:重装系统失败#Host ID:%d - 原因:%s", $host["id"], $result["msg"]), $host["uid"], 2, $host["id"]);
        } else if ($param["func"] == "crack_pass") {
            active_log_final(sprintf("模块命令:重置密码失败#Host ID:%d - 原因:%s", $host["id"], $result["msg"]), $host["uid"], 2, $host["id"]);
        }
        return json($result);
    }
    public function v10IdcsmartCommonHostArea()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $param["id"] = $host["dcimid"];
        $param["api_url"] = request()->domain() . "/v10/host/" . $host["id"] . "/idcsmart_common/custom/provision";
        $result = zjmfCurl($apiId, "/console/v1/idcsmart_common/host/" . $host["dcimid"] . "/configoption/area", $param, 30, "GET");
        if (isset($result["data"]["html"])) {
            $result["data"]["html"] = str_replace("/plugins/server/idcsmart_common/module/nokvm/templates/nokvm/", "/vendor/nokvm/", $result["data"]["html"]);
            $pattern = "/Bearer \\\$\\{localStorage.jwt\\}/";
            $result["data"]["html"] = preg_replace($pattern, "JWT " . userGetCookie(), $result["data"]["html"]);
        }
        return json($result);
    }
    public function v10IdcsmartCommonHostCustomProvision()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["host_id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $result = zjmfCurl($apiId, "/console/v1/idcsmart_common/host/" . $host["dcimid"] . "/custom/provision", $param, 30, "POST");
        if ($result["status"] == 200) {
            if ($param["func"] == "CreateSnap") {
                active_log_final(sprintf("模块命令:创建快照成功#Host ID:%d", $host["id"]), $host["uid"], 2, $host["id"]);
            } else if ($param["func"] == "DeleteSnap") {
                active_log_final(sprintf("模块命令:删除快照成功#Host ID:%d", $host["id"]), $host["uid"], 2, $host["id"]);
            } else if ($param["func"] == "RestoreSnap") {
                active_log_final(sprintf("模块命令:恢复快照成功#Host ID:%d", $host["id"]), $host["uid"], 2, $host["id"]);
            } else if ($param["func"] == "CreateBackup") {
                active_log_final(sprintf("模块命令:创建备份成功#Host ID:%d", $host["id"]), $host["uid"], 2, $host["id"]);
            } else if ($param["func"] == "RestoreBackup") {
                active_log_final(sprintf("模块命令:恢复备份成功#Host ID:%d", $host["id"]), $host["uid"], 2, $host["id"]);
            } else if ($param["func"] == "DeleteBackup") {
                active_log_final(sprintf("模块命令:删除备份成功#Host ID:%d", $host["id"]), $host["uid"], 2, $host["id"]);
            } else if ($param["func"] == "MountCdRom") {
                active_log_final(sprintf("模块命令:挂载光驱成功#Host ID:%d", $host["id"]), $host["uid"], 2, $host["id"]);
            } else if ($param["func"] == "UnmountCdRom") {
                active_log_final(sprintf("模块命令:卸载光驱成功#Host ID:%d", $host["id"]), $host["uid"], 2, $host["id"]);
            }
        } else if ($param["func"] == "CreateSnap") {
            active_log_final(sprintf("模块命令:创建快照失败#Host ID:%d - 原因:%s", $host["id"], $result["msg"]), $host["uid"], 2, $host["id"]);
        } else if ($param["func"] == "DeleteSnap") {
            active_log_final(sprintf("模块命令:删除快照失败#Host ID:%d - 原因:%s", $host["id"], $result["msg"]), $host["uid"], 2, $host["id"]);
        } else if ($param["func"] == "RestoreSnap") {
            active_log_final(sprintf("模块命令:恢复快照失败#Host ID:%d - 原因:%s", $host["id"], $result["msg"]), $host["uid"], 2, $host["id"]);
        } else if ($param["func"] == "CreateBackup") {
            active_log_final(sprintf("模块命令:创建备份失败#Host ID:%d - 原因:%s", $host["id"], $result["msg"]), $host["uid"], 2, $host["id"]);
        } else if ($param["func"] == "RestoreBackup") {
            active_log_final(sprintf("模块命令:恢复备份失败#Host ID:%d - 原因:%s", $host["id"], $result["msg"]), $host["uid"], 2, $host["id"]);
        } else if ($param["func"] == "DeleteBackup") {
            active_log_final(sprintf("模块命令:删除备份失败#Host ID:%d - 原因:%s", $host["id"], $result["msg"]), $host["uid"], 2, $host["id"]);
        } else if ($param["func"] == "MountCdRom") {
            active_log_final(sprintf("模块命令:挂载光驱失败#Host ID:%d - 原因:%s", $host["id"], $result["msg"]), $host["uid"], 2, $host["id"]);
        } else if ($param["func"] == "UnmountCdRom") {
            active_log_final(sprintf("模块命令:卸载光驱失败#Host ID:%d - 原因:%s", $host["id"], $result["msg"]), $host["uid"], 2, $host["id"]);
        }
        return json($result);
    }
    public function v10IdcsmartCommonLog()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $list = \think\Db::name("activity_log")->field("id,create_time,description,ipaddr ip")->where("uid", request()->uid)->where("usertype", "Client")->where("type", 2)->where("type_data_id", $host["id"])->limit($param["limit"] ?? 50)->page($param["page"] ?? 1)->order("id", "desc")->select()->toArray();
        $count = \think\Db::name("activity_log")->where("uid", request()->uid)->where("usertype", "Client")->where("type", 2)->where("type_data_id", $host["id"])->count();
        $result = ["status" => 200, "msg" => "请求成功", "data" => ["list" => $list, "count" => $count]];
        return jsons($result);
    }
    public function v10IdcsmartCommonUpgradeConfig()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $param["id"] = $host["dcimid"];
        $param["is_downstream"] = 1;
        $result = zjmfCurl($apiId, "/console/v1/idcsmart_common/host/" . $host["dcimid"] . "/upgrade_config", $param, 30, "GET");
        return jsons($result);
    }
    public function v10IdcsmartCommonSyncUpgradeConfigPrice()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $param["id"] = $host["dcimid"];
        $param["is_downstream"] = 1;
        $result = zjmfCurl($apiId, "/console/v1/idcsmart_common/host/" . $host["dcimid"] . "/sync_upgrade_config_price", $param, 30, "POST");
        return jsons($result);
    }
    public function v10IdcsmartCommonUpgradeConfigPost()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        $param["id"] = $host["dcimid"];
        $param["is_downstream"] = 1;
        $result = zjmfCurl($apiId, "/console/v1/idcsmart_common/host/" . $host["dcimid"] . "/upgrade_config", $param, 30, "POST");
        return jsons($result);
    }
    public function v10MfCloudIpNew()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/host/" . $host["dcimid"] . "/ip", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/host/" . $host["dcimid"] . "/ip", $param, 30, "GET");
        }
        return jsons($result);
    }
    public function v10MfCloudMachine()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/simulate_physical_machine", $param, 30, "POST");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/simulate_physical_machine", $param, 30, "POST");
        }
        return jsons($result);
    }
    public function v10MfCloudIpv6()
    {
        $param = $this->request->param();
        $host = \think\Db::name("host")->find($param["id"] ?? 0);
        if (empty($host)) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (!$apiId = getZjmfApiIdByHostId($host["id"])) {
            return jsons(["status" => 400, "msg" => "产品不存在"]);
        }
        if (getZjmfApiProductTypeByProductId($host["productid"]) == "dcimcloud") {
            $result = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/ipv6", $param, 30, "GET");
        } else {
            $result = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/ipv6", $param, 30, "GET");
        }
        return jsons($result);
    }
}

?>