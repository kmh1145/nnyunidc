<?php
namespace addons\product_divert\model;

class productDivertModel
{
    public static function getList($param)
    {
        $page = !empty($param["page"]) ? intval($param["page"]) : config("page");
        $limit = !empty($param["limit"]) ? intval($param["limit"]) : config("limit");
        $order = !empty($param["order"]) ? trim($param["order"]) : "id";
        $sort = !empty($param["sort"]) ? trim($param["sort"]) : "DESC";
        $status = !empty($param["status"]) ? trim($param["status"]) : "";
        if (!in_array($order, ["create_time", "end_time"])) {
            $order = "create_time";
        }
        $userid = $param["uid"];
        $fun = function (\think\db\Query $query) use ($status) {
            static $userid = NULL;
            if (!empty($status)) {
                $query->where("status", $status);
            }
        };
        $fun_user = function (\think\db\Query $query) use ($status, $userid) {
            $query->whereOr(["push_userid" => $userid, "pull_userid" => $userid]);
        };
        $model = \think\Db::name("product_divert")->where($fun)->where($fun_user);
        $product_divert_count = $model->count("id");
        $product_divert = $model->field("id,push_invoice_id,pull_invoice_id,product_name,product_domain,product_ip,push_userid,pull_userid,push_username,pull_username,push_cost,pull_cost,status,create_time,end_time")->order($order, $sort)->limit($limit)->page($page)->select()->toArray();
        $status_text = lang("STATUS_DESCRIBE");
        foreach ($product_divert as $k => $v) {
            if ($v["push_invoice_id"]) {
                $product_divert[$k]["push_pay_status"] = \think\Db::name("invoices")->where(["id" => $v["push_invoice_id"]])->value("status");
            }
            if ($v["pull_invoice_id"]) {
                $product_divert[$k]["pull_pay_status"] = \think\Db::name("invoices")->where(["id" => $v["pull_invoice_id"]])->value("status");
            }
            $product_divert[$k]["create_time"] = date("Y-m-d H:i", $product_divert[$k]["create_time"]);
            $product_divert[$k]["end_time"] = $product_divert[$k]["end_time"] ? date("Y-m-d H:i", $product_divert[$k]["end_time"]) : "N/A";
            $product_divert[$k]["status_text"] = $status_text[$product_divert[$k]["status"]];
        }
        return ["status" => 200, "data" => $product_divert, "count" => $product_divert_count];
    }
    public static function countProductDivert($userid)
    {
        $count = \think\Db::name("product_divert")->whereOr(["push_userid" => $userid, "pull_userid" => $userid])->count("id");
        return ["status" => 200, "data" => $count];
    }
    public static function getRowsData($param)
    {
        $whereMap = [];
        $whereMap["p.id"] = $param["id"];
        if ($param["from_author"] == "PUSH") {
            $whereMap["p.push_userid"] = $param["uid"];
        } else if ($param["from_author"] == "PULL") {
            $whereMap["p.pull_userid"] = $param["uid"];
        } else {
            return ["status" => 400, "data" => []];
        }
        $product_divert = \think\Db::name("product_divert")->alias("p")->leftJoin("invoices i", "p.push_invoice_id=i.id")->where($whereMap)->field("p.*,i.status as pay_status")->find();
        $data["product_divert"] = $product_divert;
        return ["status" => 200, "data" => $data];
    }
    public static function checkDivertData($param)
    {
        $res = \think\Db::name("plugin")->where("name", "ProductDivert")->find();
        $system = json_decode($res["config"], true);
        $product = \think\Db::name("host")->alias("h")->leftJoin("products p", "h.productid=p.id")->field("h.domain,h.dedicatedip,p.name,p.id,h.id as hid")->where(["h.id" => $param["hostid"], "h.uid" => $param["uid"]])->find();
        $data["system"] = $system;
        $data["product"] = $product;
        if (!in_array($product["id"], $system["product_range"])) {
            throw new \think\Exception(lang("NOT_PRODUCT_DIVERT"));
        }
        $product_divert = \think\Db::name("product_divert")->field("id")->where(["hostid" => $param["hostid"], "status" => 1])->find();
        if ($product_divert) {
            throw new \think\Exception(lang("NON_REPEATABLE"));
        }
        return ["status" => 200, "data" => $data];
    }
    public static function createData($params)
    {
        $touser = \think\Db::name("clients")->field("id,username")->where(["id" => $params["userid"]])->find();
        $data["hostid"] = $params["hostid"];
        $data["product_name"] = $params["name"] ?? "NAME:N/A";
        $data["product_domain"] = $params["domain"] ?? "DOMAIN:N/A";
        $data["product_ip"] = $params["dedicatedip"] ?? "IP:N/A";
        $data["push_userid"] = $params["uid"];
        $data["push_username"] = $params["uname"];
        $data["pull_userid"] = $touser["id"];
        $data["pull_username"] = $touser["username"];
        $data["create_time"] = time();
        $data["due_time"] = time() + 86400 * $params["validity_period"];
        $data["push_cost"] = $params["push_cost"];
        $data["pull_cost"] = $params["pull_cost"];
        try {
            $product_divert_id = \think\Db::name("product_divert")->insertGetId($data);
        } catch (\Exception $e) {
            throw new \think\Exception($e->getMessage());
        }
        $res["product_divert_id"] = $product_divert_id;
        $res["from_author"] = "PUSH";
        return ["status" => 200, "data" => $res];
    }
    public static function divertInvoiceID($param, $divert)
    {
        if ($param["from_author"] == "PUSH") {
            $divert_cost = $divert["push_cost"];
            $invoice_obj = "push_invoice_id";
        } else if ($param["from_author"] == "PULL") {
            $divert_cost = $divert["pull_cost"];
            $invoice_obj = "pull_invoice_id";
        } else {
            throw new \think\Exception("账单创建方式不存在");
        }
        $divert_cost = (double) $divert_cost;
        $inc_data = ["uid" => $param["uid"], "create_time" => time(), "due_time" => time(), "subtotal" => $divert_cost, "total" => $divert_cost, "status" => "Unpaid", "type" => "transfer_fee", "url" => shd_addon_url("ProductDivert://Index/pushpulllist", [], true)];
        if (empty($divert_cost)) {
            $inc_data["invoice_num"] = date("Ymd") . $param["uid"] . mt_rand(100000, 999999);
            $inc_data["paid_time"] = time();
            $inc_data["status"] = "Paid";
        }
        $item_data = ["uid" => $param["uid"], "rel_id" => $divert["hostid"], "type" => "transfer_fee", "description" => "产品转移费用账单", "amount" => $divert_cost, "due_time" => strtotime("+365 day")];
        try {
            $invoice_id = \think\Db::name("invoices")->insertGetId($inc_data);
            $item_data["invoice_id"] = $invoice_id;
            \think\Db::name("invoice_items")->insert($item_data);
            \think\Db::name("product_divert")->where(["id" => $param["product_divert_id"]])->update([$invoice_obj => $invoice_id]);
        } catch (\Exception $e) {
            throw new \think\Exception($e->getMessage());
        }
        if (empty($divert_cost)) {
            $invoice_id = 0;
        }
        return ["status" => 200, "data" => ["invoice_id" => $invoice_id]];
    }
    public static function pullServerDivert($param, $divert)
    {
        if ($param["from_author"] == "PULL") {
            $divert_cost = (double) $divert["pull_cost"];
            if (empty($divert_cost)) {
                \think\Db::name("product_divert")->where(["id" => $param["id"], "pull_userid" => $param["uid"]])->update(["status" => 2, "end_time" => time()]);
                \think\Db::name("host")->where(["id" => $divert["hostid"]])->update(["uid" => $param["uid"]]);
                $invoice_logic = new \app\common\logic\Invoices();
                $invoice_logic->productDivertCancelInvoices($divert["hostid"]);
                active_log_final(sprintf("转移产品和服务 - 将 - Host ID:%d - 从 - User ID:%d - 移动到 User ID:%d - 成功", $divert["hostid"], $divert["push_userid"], $divert["pull_userid"]), $divert["push_userid"], 2, $divert["hostid"]);
                active_log_final(sprintf("接收到转移的产品和服务 - Host ID:%d - 来自 - User ID:%d", $divert["hostid"], $divert["push_userid"]), $divert["pull_userid"], 2, $divert["hostid"]);
            }
            return true;
        }
        return false;
    }
    public static function refuseDivert($param)
    {
        $whereMap = [];
        $whereMap["id"] = $param["id"];
        if ($param["from_author"] == "PUSH") {
            $whereMap["push_userid"] = $param["uid"];
            $status = 3;
        } else if ($param["from_author"] == "PULL") {
            $whereMap["pull_userid"] = $param["uid"];
            $status = 4;
        } else if ($param["from_author"] == "SERVER") {
            $status = 4;
        } else {
            throw new \think\Exception("不存在此发起方式");
        }
        $divert = \think\Db::name("product_divert")->where($whereMap)->find();
        if (!$divert) {
            throw new \think\Exception("未匹配到此记录,稍后刷新记录后重试");
        }
        $status_text = lang("STATUS_DESCRIBE");
        if ($divert["status"] != 1) {
            throw new \think\Exception("无法进行此操作,因为记录 " . $status_text[$divert["status"]]);
        }
        $invoice = \think\Db::name("invoices")->where(["id" => $divert["push_invoice_id"]])->field("status as pay_status,subtotal")->find();
        if (!$divert) {
            throw new \think\Exception("账单不存在，无法进行此操作");
        }
        if ($invoice["pay_status"] == "Unpaid") {
            \think\Db::name("product_divert")->where(["id" => $divert["id"]])->update(["status" => $status, "end_time" => time()]);
            \think\Db::name("invoices")->where(["id" => $divert["push_invoice_id"]])->update(["status" => "Cancelled"]);
        }
        if ($invoice["pay_status"] == "Paid") {
            \think\Db::name("product_divert")->where(["id" => $divert["id"]])->update(["status" => $status, "end_time" => time()]);
            \think\Db::name("invoices")->where(["id" => $divert["push_invoice_id"]])->update(["status" => "Refunded"]);
            \think\Db::name("clients")->where(["id" => $divert["push_userid"]])->setInc("credit", $invoice["subtotal"]);
        }
        return ["status" => 200, "data" => []];
    }
    public static function productDivertTnvoicesidUpgrade($invoiceid, $newinvoiceid)
    {
        $object_arr = ["push_userid" => "push_invoice_id", "pull_userid" => "pull_invoice_id"];
        $invoices = \think\Db::name("invoices")->where("id", $newinvoiceid)->field("uid,type")->find();
        if ($invoices["type"] != "transfer_fee") {
            return true;
        }
        $invoices_uid = $invoices["uid"];
        $product_divert = \think\Db::name("product_divert")->where("push_invoice_id", $invoiceid)->whereOr("pull_invoice_id", $invoiceid)->field("push_userid,pull_userid")->find();
        if (empty($product_divert)) {
            return false;
        }
        $product_divert = array_flip($product_divert);
        $object = $product_divert[$invoices_uid];
        $object_final = $object_arr[$object];
        \think\Db::name("product_divert")->where([$object_final => $invoiceid])->update([$object_final => $newinvoiceid]);
        return true;
    }
    public static function productDivertTnvoicesDeleteRefuseDivert($invoiceid)
    {
        $object_arr = ["push_userid" => "PUSH", "pull_userid" => "PULL"];
        $invoices = \think\Db::name("invoices")->where("id", $invoiceid)->field("uid,type")->find();
        if ($invoices["type"] != "transfer_fee") {
            return false;
        }
        $invoices_uid = $invoices["uid"];
        $product_divert = \think\Db::name("product_divert")->where("push_invoice_id", $invoiceid)->whereOr("pull_invoice_id", $invoiceid)->field("push_userid,pull_userid,id")->find();
        if (empty($product_divert)) {
            return false;
        }
        $product_divert_id = $product_divert["id"];
        unset($product_divert["id"]);
        $product_divert = array_flip($product_divert);
        $object = $product_divert[$invoices_uid];
        $object_final = $object_arr[$object];
        $data["id"] = $product_divert_id;
        $data["uid"] = $invoices_uid;
        $data["from_author"] = $object_final;
        self::refuseDivert($data);
        return true;
    }
    public static function checkDivertInvoice($invoiceid)
    {
        $invoices = \think\Db::name("invoices")->where("id", $invoiceid)->field("uid,type")->find();
        if ($invoices["type"] != "transfer_fee") {
            return ["status" => 200, "msg" => ""];
        }
        $plugin = \think\Db::name("plugin")->where("name", "ProductDivert")->find();
        if (empty($plugin) || $plugin["status"] == 0) {
            return ["status" => 400, "msg" => "产品转移功能已被关闭,请您及时关闭此账单,以免进行支付"];
        }
        $product_divert = \think\Db::name("product_divert")->where("push_invoice_id", $invoiceid)->whereOr("pull_invoice_id", $invoiceid)->field("push_userid,pull_userid")->find();
        if (empty($product_divert)) {
            return ["status" => 400, "msg" => "转移流程已被取消,请您及时关闭此账单,以免进行支付"];
        }
        return ["status" => 200, "msg" => ""];
    }
}

?>