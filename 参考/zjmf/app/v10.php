<?php
function getApiType($api_id)
{
    $api = think\Db::name("zjmf_finance_api")->where("id", $api_id)->find();
    return $api["type"] ?? "";
}
function getZjmfApiIdByProductId($id)
{
    $product = think\Db::name("products")->find($id);
    $api = think\Db::name("zjmf_finance_api")->where("type", "v10")->where("id", $product["zjmf_api_id"])->find();
    return $api["id"] ?? 0;
}
function getZjmfApiProductTypeByProductId($id)
{
    $product = think\Db::name("products")->find($id);
    return $product["type"] ?? "";
}
function getZjmfApiIdByHostId($id)
{
    $host = think\Db::name("host")->find($id);
    return getzjmfapiidbyproductid($host["productid"]);
}
function getUpstreamProductIdByProductId($id)
{
    $product = think\Db::name("products")->find($id);
    return $product["upstream_pid"] ?? 0;
}
function v10ProductInputUpdate($pid, $apiId, $data)
{
    $result = zjmfCurl($apiId, "api/v1/product/" . $data["upstream_pid"], [], 30, "GET");
    if ($result["status"] == 200) {
        $upstreamProduct = $result["data"]["product"];
        if ($upstreamProduct["pay_type"] == "recurring_prepayment") {
            $pay_type = ["pay_type" => "recurring", "pay_hour_cycle" => 720, "pay_day_cycle" => 30, "pay_ontrial_status" => 0, "pay_ontrial_cycle" => 0, "pay_ontrial_condition" => [], "pay_ontrial_cycle_type" => "day"];
            $data["pay_type"] = json_encode($pay_type);
            updateProductPricing($pid);
        } else if ($upstreamProduct["pay_type"] == "onetime") {
            $pay_type = ["pay_type" => "onetime", "pay_hour_cycle" => 720, "pay_day_cycle" => 30, "pay_ontrial_status" => 0, "pay_ontrial_cycle" => 0, "pay_ontrial_condition" => [], "pay_ontrial_cycle_type" => "day"];
            $data["pay_type"] = json_encode($pay_type);
        }
        $data["auto_setup"] = $upstreamProduct["auto_setup"] ? "payment" : "";
        $data["stock_control"] = $upstreamProduct["stock_control"];
        $data["upstream_qty"] = $upstreamProduct["qty"];
        $data["qty"] = $upstreamProduct["qty"];
        $data["cancel_control"] = $upstreamProduct["cancel_control"] ?? 0;
        $data["upstream_version"] = 1;
        $data["upstream_price"] = $upstreamProduct["price"];
        $data["upstream_cycle"] = $upstreamProduct["cycle"];
        $data["description"] = $data["description"] ?? $upstreamProduct["description"];
    }
    think\Db::name("products")->where("id", $pid)->update($data);
    return true;
}
function updateProductPricing($pid)
{
    $data = [];
    $data["osetupfee"] = 0;
    $data["hsetupfee"] = 0;
    $data["dsetupfee"] = 0;
    $data["ontrialfee"] = 0;
    $data["msetupfee"] = 0;
    $data["qsetupfee"] = 0;
    $data["ssetupfee"] = 0;
    $data["asetupfee"] = 0;
    $data["bsetupfee"] = 0;
    $data["tsetupfee"] = 0;
    $data["foursetupfee"] = 0;
    $data["fivesetupfee"] = 0;
    $data["sixsetupfee"] = 0;
    $data["sevensetupfee"] = 0;
    $data["eightsetupfee"] = 0;
    $data["ninesetupfee"] = 0;
    $data["tensetupfee"] = 0;
    $data["onetime"] = 0;
    $data["hour"] = 0;
    $data["day"] = 0;
    $data["ontrial"] = 0;
    $data["monthly"] = 0;
    $data["quarterly"] = 0;
    $data["semiannually"] = 0;
    $data["annually"] = 0;
    $data["biennially"] = 0;
    $data["triennially"] = 0;
    $data["fourly"] = 0;
    $data["fively"] = 0;
    $data["sixly"] = 0;
    $data["sevenly"] = 0;
    $data["eightly"] = 0;
    $data["ninely"] = 0;
    $data["tenly"] = 0;
    think\Db::name("pricing")->where("type", "product")->where("relid", $pid)->update($data);
    return true;
}
function v10HostCreate($id)
{
    $token = md5(randStr(16) . time() . $id);
    $downstream_url = getDomain() . getRootUrl();
    $host = think\Db::name("host")->alias("a")->field("a.upstream_configoption,a.stream_info,a.orderid,b.server_group,a.id,a.uid,a.productid,a.domainstatus,a.regdate,a.dcimid,b.welcome_email,b.type,c.email,a.billingcycle,b.pay_type,b.name,a.nextduedate,a.billingcycle,a.dedicatedip,a.domain,a.username,a.password,a.os,a.assignedips,a.create_time,a.stream_info,b.api_type,b.zjmf_api_id,b.upstream_pid,b.server_group")->leftJoin("products b", "a.productid=b.id")->leftJoin("clients c", "a.uid=c.id")->where("a.id", $id)->find();
    $apiId = $host["zjmf_api_id"];
    $stream_info = $host["stream_info"];
    $stream_info = json_decode($stream_info, true) ?: [];
    if (!empty($stream_info["token"])) {
        $token = $stream_info["token"];
    } else {
        $update["stream_info"] = $stream_info;
        $update["stream_info"]["token"] = $token;
        $update["stream_info"] = json_encode($update["stream_info"]);
        think\Db::name("host")->where("id", $id)->update($update);
    }
    $clearCartData = ["downstream_url" => $downstream_url, "downstream_token" => $token, "downstream_host_id" => $id, "downstream_client_id" => $host["uid"], "downstream_system_type" => "finance"];
    $res = zjmfCurl($apiId, "/console/v1/cart", $clearCartData, 30, "DELETE");
    if ($res["status"] == 200) {
        if (isset($res["data"]["order_id"]) && $res["data"]["order_id"]) {
            $payData = ["id" => $res["data"]["order_id"] ?? 0, "gateway" => "credit"];
            $res = zjmfCurl($apiId, "/console/v1/pay", $payData, 30, "POST");
        } else {
            $cartData = ["product_id" => $host["upstream_pid"], "qty" => 1, "config_options" => json_decode($host["upstream_configoption"], true)["config_options"], "self_defined_field" => json_decode($host["upstream_configoption"], true)["self_defined_field"]];
            $res = zjmfCurl($apiId, "/console/v1/cart", $cartData, 30, "POST");
            if ($res["status"] == 200) {
                $settleCartData = $clearCartData;
                $settleCartData["positions"] = [0];
                $settleCartData["downstream_client_id"] = $clearCartData["downstream_client_id"];
                $res = zjmfCurl($apiId, "/console/v1/cart/settle", $settleCartData, 30, "POST");
                if ($res["status"] == 200) {
                    think\Db::name("host")->where("id", $id)->update(["dcimid" => $res["data"]["host_ids"][0] ?? 0]);
                    if (0 < $res["data"]["amount"]) {
                        $payData = ["id" => $res["data"]["order_id"] ?? "", "gateway" => "credit"];
                        $res = zjmfCurl($apiId, "/console/v1/pay", $payData, 30, "POST");
                    }
                }
            }
        }
    }
    return $res;
}
function v10HostSuspend($id, $reason = "")
{
    $host = think\Db::name("host")->alias("a")->field("a.upstream_configoption,a.stream_info,a.orderid,b.server_group,a.id,a.uid,a.productid,a.domainstatus,a.regdate,a.dcimid,b.welcome_email,b.type,c.email,a.billingcycle,b.pay_type,b.name,a.nextduedate,a.billingcycle,a.dedicatedip,a.domain,a.username,a.password,a.os,a.assignedips,a.create_time,a.stream_info,b.api_type,b.zjmf_api_id,b.upstream_pid,b.server_group")->leftJoin("products b", "a.productid=b.id")->leftJoin("clients c", "a.uid=c.id")->where("a.id", $id)->find();
    $apiId = $host["zjmf_api_id"];
    $suspendData = ["suspend_type" => "downstream", "suspend_reason" => $reason ?: "财务系统代理商暂停"];
    $res = zjmfCurl($apiId, "/console/v1/host/" . $host["dcimid"] . "/module/suspend", $suspendData, 30, "POST");
    if ($res["status"] == 200) {
        $Host = new app\common\logic\Host();
        $Host->sync($id);
    }
    return $res;
}
function v10HostUnsuspend($id)
{
    $host = think\Db::name("host")->alias("a")->field("a.upstream_configoption,a.stream_info,a.orderid,b.server_group,a.id,a.uid,a.productid,a.domainstatus,a.regdate,a.dcimid,b.welcome_email,b.type,c.email,a.billingcycle,b.pay_type,b.name,a.nextduedate,a.billingcycle,a.dedicatedip,a.domain,a.username,a.password,a.os,a.assignedips,a.create_time,a.stream_info,b.api_type,b.zjmf_api_id,b.upstream_pid,b.server_group")->leftJoin("products b", "a.productid=b.id")->leftJoin("clients c", "a.uid=c.id")->where("a.id", $id)->find();
    $apiId = $host["zjmf_api_id"];
    $res = zjmfCurl($apiId, "/console/v1/host/" . $host["dcimid"] . "/module/unsuspend", [], 30, "POST");
    if ($res["status"] == 200) {
        $Host = new app\common\logic\Host();
        $Host->sync($id);
    }
    return $res;
}
function v10HostTerminate($id)
{
    $host = think\Db::name("host")->alias("a")->field("a.upstream_configoption,a.stream_info,a.orderid,b.server_group,a.id,a.uid,a.productid,a.domainstatus,a.regdate,a.dcimid,b.welcome_email,b.type,c.email,a.billingcycle,b.pay_type,b.name,a.nextduedate,a.billingcycle,a.dedicatedip,a.domain,a.username,a.password,a.os,a.assignedips,a.create_time,a.stream_info,b.api_type,b.zjmf_api_id,b.upstream_pid,b.server_group")->leftJoin("products b", "a.productid=b.id")->leftJoin("clients c", "a.uid=c.id")->where("a.id", $id)->find();
    $apiId = $host["zjmf_api_id"];
    $terminateData = ["host_id" => $host["dcimid"], "suspend_reason" => "代理商删除", "type" => "Immediate"];
    $res = zjmfCurl($apiId, "/console/v1/refund", $terminateData, 30, "POST");
    if ($res["status"] == 200) {
        $Host = new app\common\logic\Host();
        $Host->sync($id);
    }
    return $res;
}
function v10HostStatus($id)
{
    $host = think\Db::name("host")->alias("a")->field("a.upstream_configoption,a.stream_info,a.orderid,b.server_group,a.id,a.uid,a.productid,a.domainstatus,a.regdate,a.dcimid,b.welcome_email,b.type,c.email,a.billingcycle,b.pay_type,b.name,a.nextduedate,a.billingcycle,a.dedicatedip,a.domain,a.username,a.password,a.os,a.assignedips,a.create_time,a.stream_info,b.api_type,b.zjmf_api_id,b.upstream_pid,b.server_group")->leftJoin("products b", "a.productid=b.id")->leftJoin("clients c", "a.uid=c.id")->where("a.id", $id)->find();
    $apiId = $host["zjmf_api_id"];
    if (getzjmfapiproducttypebyproductid($id) == "dcimcloud") {
        $res = zjmfCurl($apiId, "/console/v1/mf_cloud/" . $host["dcimid"] . "/status", [], 30, "GET");
    } else {
        $res = zjmfCurl($apiId, "/console/v1/mf_dcim/" . $host["dcimid"] . "/status", [], 30, "GET");
    }
    if ($res["status"] == 200) {
        $Host = new app\common\logic\Host();
        $Host->sync($id);
    }
    return $res;
}
function v10HostRenew($id)
{
    $host = think\Db::name("host")->alias("a")->field("a.upstream_configoption,a.stream_info,a.orderid,b.server_group,a.id,a.uid,a.productid,a.domainstatus,a.regdate,a.dcimid,b.welcome_email,b.type,c.email,a.billingcycle,b.pay_type,b.name,a.nextduedate,a.billingcycle,a.dedicatedip,a.domain,a.username,a.password,a.os,a.assignedips,a.create_time,a.stream_info,b.api_type,b.zjmf_api_id,b.upstream_pid,b.server_group")->leftJoin("products b", "a.productid=b.id")->leftJoin("clients c", "a.uid=c.id")->where("a.id", $id)->find();
    $apiId = $host["zjmf_api_id"];
    $renewData = ["billing_cycle" => $host["billingcycle"] ?? ""];
    $res = zjmfCurl($apiId, "/console/v1/host/" . $host["dcimid"] . "/renew", $renewData, 30, "POST");
    if ($res["status"] == 200) {
        if ($res["code"] == "Unpaid") {
            $creditData = ["id" => $res["data"]["id"] ?? 0, "use" => 1];
            $res = zjmfCurl($apiId, "/console/v1/credit", $creditData, 30, "POST");
            if ($res["status"] == 200) {
                $payData = ["id" => $res["data"]["id"], "gateway" => "credit"];
                $res = zjmfCurl($apiId, "/console/v1/pay", $payData, 30, "POST");
                if ($res["status"] == 200 && $res["code"] == "Paid") {
                    $Host = new app\common\logic\Host();
                    $Host->sync($id);
                }
            }
        }
        unset($res["code"]);
    }
    return $res;
}
function v10SyncCustomFields($param)
{
    if (!is_array($param["self_defined_field"])) {
        return false;
    }
    $time = time();
    $productId = $param["product_id"];
    $current = think\Db::name("customfields")->field("id,fieldname,fieldtype,description,regexpr,fieldoptions,sortorder,required,showorder,showinvoice,showdetail,upstream_id")->where("relid", $productId)->where("type", "product")->where("upstream_id", ">", 0)->select()->toArray();
    $old = [];
    foreach ($current as $v) {
        $id = $v["id"];
        $upstreamId = $v["upstream_id"];
        unset($v["id"]);
        $old[$upstreamId] = ["id" => $id, "md5" => md5(json_encode($v))];
    }
    $order = 0;
    foreach ($param["self_defined_field"] as $v) {
        $data = ["fieldname" => $v["field_name"], "fieldtype" => $v["field_type"], "description" => $v["description"], "regexpr" => $v["regexpr"], "fieldoptions" => $v["field_type"] == "dropdown" ? $v["field_option"] : "", "sortorder" => $order, "required" => $v["is_required"], "showorder" => 1, "showinvoice" => !in_array($v["field_type"], ["link", "password"]) ? 1 : 0, "showdetail" => 1, "upstream_id" => $v["id"]];
        $order++;
        if (!isset($old[$v["id"]])) {
            $data["type"] = "product";
            $data["relid"] = $productId;
            $data["create_time"] = $time;
            think\Db::name("customfields")->insert($data);
        } else {
            if ($old[$v["id"]]["md5"] !== md5(json_encode($data))) {
                $data["update_time"] = $time;
                think\Db::name("customfields")->where("id", $old[$v["id"]]["id"])->update($data);
            }
            unset($old[$v["id"]]);
        }
    }
    if (!empty($old)) {
        $id = array_column($old, "id");
        think\Db::name("customfields")->whereIn("id", $id)->delete();
        think\Db::name("customfieldsvalues")->whereIn("fieldid", $id)->delete();
    }
}

?>