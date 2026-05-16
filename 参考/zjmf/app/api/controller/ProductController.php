<?php
namespace app\api\controller;

class ProductController
{
    public function proInfo()
    {
        $param = request()->param();
        if (isset($param["pids"])) {
            if (!is_array($param["pids"])) {
                $pids = [$param["pids"]];
            } else {
                $pids = $param["pids"];
            }
        } else {
            $pids = [];
        }
        $logic = new \app\common\logic\Product();
        $infos = $logic->getInfoCache();
        if (empty($infos)) {
            $logic->updateInfoCache();
            $infos = $logic->getInfoCache();
        }
        if (!empty($pids[0])) {
            $infos = array_filter($infos, function ($value) use ($pids) {
                if (!in_array($value["id"], $pids)) {
                    return false;
                }
                return true;
            });
            $infos = array_values($infos);
            if (empty($infos)) {
                $logic->updateInfoCache();
                $infos = $logic->getInfoCache();
                $infos = array_filter($infos, function ($value) use ($pids) {
                    if (!in_array($value["id"], $pids)) {
                        return false;
                    }
                    return true;
                });
                $infos = array_values($infos);
            }
        }
        $currency = \think\Db::name("currencies")->where("default", 1)->value("code");
        $data = ["info" => $infos, "currency" => $currency];
        return json(["status" => 200, "msg" => "请求成功", "data" => $data]);
    }
    public function proDetail()
    {
        $param = request()->param();
        if (isset($param["pids"])) {
            if (!is_array($param["pids"])) {
                $pids = [$param["pids"]];
            } else {
                $pids = $param["pids"];
            }
        } else {
            $pids = \think\Db::name("products")->column("id") ?: [];
        }
        $logic = new \app\common\logic\Product();
        $concurrent = $logic->concurrent;
        if ($concurrent < count($pids)) {
            return json(["status" => 400, "msg" => "商品数量过多,请分批请求,最大请求数量为" . $concurrent . "个"]);
        }
        $detail = [];
        foreach ($pids as $pid) {
            $tmp = $logic->getDetailCache($pid);
            if (empty($tmp)) {
                $logic->updateDetailCache([$pid]);
            }
            $tmp = $logic->getDetailCache($pid);
            $detail[$pid] = $tmp[$pid];
        }
        $data = ["detail" => $detail];
        return json(["status" => 200, "msg" => "请求成功", "data" => $data]);
    }
    public function proList()
    {
        $where = function (\think\db\Query $query) {
            $query->whereIn("type", ["dcim", "dcimcloud", "hostingaccount", "server", "cloud", "bareMetal", "software", "cdn", "other", "ssl", "domain", "sms"])->whereIn("api_type", ["normal", "zjmf_api"]);
        };
        $filterproducts = \think\Db::name("products")->field("id,type,gid,name,description,pay_method,tax,order,pay_type,api_type,upstream_version,upstream_price_type,upstream_price_value,stock_control,qty")->where($where)->select()->toArray();
        $currencyid = 1;
        $uid = !empty(request()->uid) ? request()->uid : "";
        $newfilterproducts = [];
        foreach ($filterproducts as $key => $v) {
            if (!empty($v)) {
                $paytype = (array) json_decode($v["pay_type"]);
                $pricing = \think\Db::name("pricing")->where("type", "product")->where("relid", $v["id"])->where("currency", $currencyid)->find();
                if (!empty($paytype["pay_ontrial_status"])) {
                    if (0 <= $pricing["ontrial"]) {
                        $v["product_price"] = $pricing["ontrial"];
                        $v["setup_fee"] = $pricing["ontrialfee"];
                        $v["billingcycle"] = "ontrial";
                        $v["billingcycle_zh"] = lang("ONTRIAL");
                    } else {
                        $v["product_price"] = 0;
                        $v["setup_fee"] = 0;
                        $v["billingcycle"] = "";
                        $v["billingcycle_zh"] = lang("PRICE_NO_CONFIG");
                    }
                    $v["ontrial"] = 1;
                    $v["ontrial_cycle"] = $paytype["pay_ontrial_cycle"];
                    $v["ontrial_cycle_type"] = $paytype["pay_ontrial_cycle_type"] ?: "day";
                    $v["ontrial_price"] = $pricing["ontrial"];
                    $v["ontrial_setup_fee"] = $pricing["ontrialfee"];
                } else {
                    $v["ontrial"] = 0;
                }
                if ($paytype["pay_type"] == "free") {
                    $v["product_price"] = 0;
                    $v["setup_fee"] = 0;
                    $v["billingcycle"] = "free";
                    $v["billingcycle_zh"] = lang("FREE");
                } else if ($paytype["pay_type"] == "onetime") {
                    if (0 <= $pricing["onetime"]) {
                        $v["product_price"] = $pricing["onetime"];
                        $v["setup_fee"] = $pricing["osetupfee"];
                        $v["billingcycle"] = "onetime";
                        $v["billingcycle_zh"] = lang("ONETIME");
                    } else {
                        $v["product_price"] = 0;
                        $v["setup_fee"] = 0;
                        $v["billingcycle"] = "";
                        $v["billingcycle_zh"] = lang("PRICE_NO_CONFIG");
                    }
                } else if (!empty($pricing) && $paytype["pay_type"] == "recurring") {
                    if (0 <= $pricing["hour"]) {
                        $v["product_price"] = $pricing["hour"];
                        $v["setup_fee"] = $pricing["hsetupfee"];
                        $v["billingcycle"] = "hour";
                        $v["billingcycle_zh"] = lang("HOUR");
                    } else if (0 <= $pricing["day"]) {
                        $v["product_price"] = $pricing["day"];
                        $v["setup_fee"] = $pricing["dsetupfee"];
                        $v["billingcycle"] = "day";
                        $v["billingcycle_zh"] = lang("DAY");
                    } else if (0 <= $pricing["monthly"]) {
                        $v["product_price"] = $pricing["monthly"];
                        $v["setup_fee"] = $pricing["msetupfee"];
                        $v["billingcycle"] = "monthly";
                        $v["billingcycle_zh"] = lang("MONTHLY");
                    } else if (0 <= $pricing["quarterly"]) {
                        $v["product_price"] = $pricing["quarterly"];
                        $v["setup_fee"] = $pricing["qsetupfee"];
                        $v["billingcycle"] = "quarterly";
                        $v["billingcycle_zh"] = lang("QUARTERLY");
                    } else if (0 <= $pricing["semiannually"]) {
                        $v["product_price"] = $pricing["semiannually"];
                        $v["setup_fee"] = $pricing["ssetupfee"];
                        $v["billingcycle"] = "semiannually";
                        $v["billingcycle_zh"] = lang("SEMIANNUALLY");
                    } else if (0 <= $pricing["annually"]) {
                        $v["product_price"] = $pricing["annually"];
                        $v["setup_fee"] = $pricing["asetupfee"];
                        $v["billingcycle"] = "annually";
                        $v["billingcycle_zh"] = lang("ANNUALLY");
                    } else if (0 <= $pricing["biennially"]) {
                        $v["product_price"] = $pricing["biennially"];
                        $v["setup_fee"] = $pricing["bsetupfee"];
                        $v["billingcycle"] = "biennially";
                        $v["billingcycle_zh"] = lang("BIENNIALLY");
                    } else if (0 <= $pricing["triennially"]) {
                        $v["product_price"] = $pricing["triennially"];
                        $v["setup_fee"] = $pricing["tsetupfee"];
                        $v["billingcycle"] = "triennially";
                        $v["billingcycle_zh"] = lang("TRIENNIALLY");
                    } else if (0 <= $pricing["fourly"]) {
                        $v["product_price"] = $pricing["fourly"];
                        $v["setup_fee"] = $pricing["foursetupfee"];
                        $v["billingcycle"] = "fourly";
                        $v["billingcycle_zh"] = lang("FOURLY");
                    } else if (0 <= $pricing["fively"]) {
                        $v["product_price"] = $pricing["fively"];
                        $v["setup_fee"] = $pricing["fivesetupfee"];
                        $v["billingcycle"] = "fively";
                        $v["billingcycle_zh"] = lang("FIVELY");
                    } else if (0 <= $pricing["sixly"]) {
                        $v["product_price"] = $pricing["sixly"];
                        $v["setup_fee"] = $pricing["sixsetupfee"];
                        $v["billingcycle"] = "sixly";
                        $v["billingcycle_zh"] = lang("SIXLY");
                    } else if (0 <= $pricing["sevenly"]) {
                        $v["product_price"] = $pricing["sevenly"];
                        $v["setup_fee"] = $pricing["sevensetupfee"];
                        $v["billingcycle"] = "sevenly";
                        $v["billingcycle_zh"] = lang("SEVENLY");
                    } else if (0 <= $pricing["eightly"]) {
                        $v["product_price"] = $pricing["eightly"];
                        $v["setup_fee"] = $pricing["eightsetupfee"];
                        $v["billingcycle"] = "eightly";
                        $v["billingcycle_zh"] = lang("EIGHTLY");
                    } else if (0 <= $pricing["ninely"]) {
                        $v["product_price"] = $pricing["ninely"];
                        $v["setup_fee"] = $pricing["ninesetupfee"];
                        $v["billingcycle"] = "ninely";
                        $v["billingcycle_zh"] = lang("NINELY");
                    } else if (0 <= $pricing["tenly"]) {
                        $v["product_price"] = $pricing["tenly"];
                        $v["setup_fee"] = $pricing["tensetupfee"];
                        $v["billingcycle"] = "tenly";
                        $v["billingcycle_zh"] = lang("TENLY");
                    } else {
                        $v["product_price"] = 0;
                        $v["setup_fee"] = 0;
                        $v["billingcycle"] = "";
                        $v["billingcycle_zh"] = lang("PRICE_CONFIG_ERROR");
                    }
                } else {
                    $v["product_price"] = 0;
                    $v["setup_fee"] = 0;
                    $v["billingcycle"] = "";
                    $v["billingcycle_zh"] = lang("PRICE_NO_CONFIG");
                }
                if ($paytype["pay_type"] == "recurring" && in_array($v["type"], array_keys(config("developer_app_product_type"))) && 0 < $pricing["annually"]) {
                    $v["product_price"] = $pricing["annually"];
                    $v["setup_fee"] = $pricing["asetupfee"];
                    $v["billingcycle"] = "annually";
                    $v["billingcycle_zh"] = lang("ANNUALLY");
                }
                $v["product_price"] = bcadd($v["setup_fee"], $v["product_price"], 2);
                $cart_logic = new \app\common\logic\Cart();
                $rebate_total = 0;
                $config_total = $cart_logic->getProductDefaultConfigPrice($v["id"], $currencyid, $v["billingcycle"], $rebate_total);
                $rebate_total = bcadd($v["product_price"], $rebate_total, 2);
                $v["product_price"] = bcadd($v["product_price"], $config_total, 2);
                if ($v["api_type"] == "zjmf_api" && 0 < $v["upstream_version"] && $v["upstream_price_type"] == "percent") {
                    $v["product_price"] = bcmul($v["product_price"], $v["upstream_price_value"] / 100, 2);
                    if ($v["ontrial"] == 1) {
                        $v["ontrial_price"] = bcmul($v["ontrial_price"], $v["upstream_price_value"] / 100, 2);
                        $v["ontrial_setup_fee"] = bcmul($v["ontrial_setup_fee"], $v["upstream_price_value"] / 100, 2);
                    }
                    $rebate_total = bcmul($rebate_total, $v["upstream_price_value"] / 100, 2);
                }
                if ($v["api_type"] == "resource") {
                    $grade = resourceUserGradePercent($uid, $v["id"]);
                    $v["product_price"] = bcmul($v["product_price"], $grade / 100, 2);
                    if ($v["ontrial"] == 1) {
                        $v["ontrial_price"] = bcmul($v["ontrial_price"], $grade / 100, 2);
                        $v["ontrial_setup_fee"] = bcmul($v["ontrial_setup_fee"], $grade / 100, 2);
                    }
                    $rebate_total = bcmul($rebate_total, $grade / 100, 2);
                }
                $flag = getSaleProductUser($v["id"], $uid);
                $v["bates"] = 0;
                $v["sale_price"] = $v["bates"];
                $v["has_bates"] = 0;
                if ($flag) {
                    if ($flag["type"] == 1) {
                        $bates = bcdiv($flag["bates"], 100, 2);
                        $rebate = bcmul($rebate_total, 1 - $bates, 2) < 0 ? 0 : bcmul($rebate_total, 1 - $bates, 2);
                        $v["sale_price"] = bcsub($v["product_price"], $rebate, 2) < 0 ? 0 : bcsub($v["product_price"], $rebate, 2);
                        $v["bates"] = bcmul($v["product_price"], 1 - $bates, 2);
                    } else if ($flag["type"] == 2) {
                        $bates = $flag["bates"];
                        $rebate = $rebate_total < $bates ? $rebate_total : $bates;
                        $v["sale_price"] = bcsub($v["product_price"], $rebate, 2) < 0 ? 0 : bcsub($v["product_price"], $rebate, 2);
                        $v["bates"] = $bates;
                    }
                    $v["has_bates"] = 1;
                }
            }
            $payType = json_decode($v["pay_type"], true)["pay_type"] ?? "";
            if ($payType == "recurring") {
                $v["pay_type"] = "recurring_prepayment";
            } else {
                $v["pay_type"] = $payType;
            }
            $v["price"] = $v["product_price"];
            $v["cycle"] = $v["billingcycle_zh"];
            $newfilterproducts[$key] = $v;
            if ($v["billingcycle"] == "") {
                unset($newfilterproducts[$key]);
            }
        }
        $newfilterproducts = array_values($newfilterproducts);
        $currency = \think\Db::name("currencies")->where("default", 1)->value("code");
        return json(["status" => 200, "msg" => "请求成功", "data" => ["list" => $newfilterproducts, "currency_code" => $currency]]);
    }
    public function detail()
    {
        $param = request()->param();
        $id = $param["id"] ?? 0;
        $v = \think\Db::name("products")->field("id,type,gid,name,description,pay_method,tax,order,pay_type,api_type,upstream_version,upstream_price_type,upstream_price_value,stock_control,qty")->where("id", $id)->find();
        $currencyid = 1;
        $uid = !empty(request()->uid) ? request()->uid : "";
        if (!empty($v)) {
            $paytype = (array) json_decode($v["pay_type"]);
            $pricing = \think\Db::name("pricing")->where("type", "product")->where("relid", $v["id"])->where("currency", $currencyid)->find();
            if (!empty($paytype["pay_ontrial_status"])) {
                if (0 <= $pricing["ontrial"]) {
                    $v["product_price"] = $pricing["ontrial"];
                    $v["setup_fee"] = $pricing["ontrialfee"];
                    $v["billingcycle"] = "ontrial";
                    $v["billingcycle_zh"] = lang("ONTRIAL");
                } else {
                    $v["product_price"] = 0;
                    $v["setup_fee"] = 0;
                    $v["billingcycle"] = "";
                    $v["billingcycle_zh"] = lang("PRICE_NO_CONFIG");
                }
                $v["ontrial"] = 1;
                $v["ontrial_cycle"] = $paytype["pay_ontrial_cycle"];
                $v["ontrial_cycle_type"] = $paytype["pay_ontrial_cycle_type"] ?: "day";
                $v["ontrial_price"] = $pricing["ontrial"];
                $v["ontrial_setup_fee"] = $pricing["ontrialfee"];
            } else {
                $v["ontrial"] = 0;
            }
            if ($paytype["pay_type"] == "free") {
                $v["product_price"] = 0;
                $v["setup_fee"] = 0;
                $v["billingcycle"] = "free";
                $v["billingcycle_zh"] = lang("FREE");
            } else if ($paytype["pay_type"] == "onetime") {
                if (0 <= $pricing["onetime"]) {
                    $v["product_price"] = $pricing["onetime"];
                    $v["setup_fee"] = $pricing["osetupfee"];
                    $v["billingcycle"] = "onetime";
                    $v["billingcycle_zh"] = lang("ONETIME");
                } else {
                    $v["product_price"] = 0;
                    $v["setup_fee"] = 0;
                    $v["billingcycle"] = "";
                    $v["billingcycle_zh"] = lang("PRICE_NO_CONFIG");
                }
            } else if (!empty($pricing) && $paytype["pay_type"] == "recurring") {
                if (0 <= $pricing["hour"]) {
                    $v["product_price"] = $pricing["hour"];
                    $v["setup_fee"] = $pricing["hsetupfee"];
                    $v["billingcycle"] = "hour";
                    $v["billingcycle_zh"] = lang("HOUR");
                } else if (0 <= $pricing["day"]) {
                    $v["product_price"] = $pricing["day"];
                    $v["setup_fee"] = $pricing["dsetupfee"];
                    $v["billingcycle"] = "day";
                    $v["billingcycle_zh"] = lang("DAY");
                } else if (0 <= $pricing["monthly"]) {
                    $v["product_price"] = $pricing["monthly"];
                    $v["setup_fee"] = $pricing["msetupfee"];
                    $v["billingcycle"] = "monthly";
                    $v["billingcycle_zh"] = lang("MONTHLY");
                } else if (0 <= $pricing["quarterly"]) {
                    $v["product_price"] = $pricing["quarterly"];
                    $v["setup_fee"] = $pricing["qsetupfee"];
                    $v["billingcycle"] = "quarterly";
                    $v["billingcycle_zh"] = lang("QUARTERLY");
                } else if (0 <= $pricing["semiannually"]) {
                    $v["product_price"] = $pricing["semiannually"];
                    $v["setup_fee"] = $pricing["ssetupfee"];
                    $v["billingcycle"] = "semiannually";
                    $v["billingcycle_zh"] = lang("SEMIANNUALLY");
                } else if (0 <= $pricing["annually"]) {
                    $v["product_price"] = $pricing["annually"];
                    $v["setup_fee"] = $pricing["asetupfee"];
                    $v["billingcycle"] = "annually";
                    $v["billingcycle_zh"] = lang("ANNUALLY");
                } else if (0 <= $pricing["biennially"]) {
                    $v["product_price"] = $pricing["biennially"];
                    $v["setup_fee"] = $pricing["bsetupfee"];
                    $v["billingcycle"] = "biennially";
                    $v["billingcycle_zh"] = lang("BIENNIALLY");
                } else if (0 <= $pricing["triennially"]) {
                    $v["product_price"] = $pricing["triennially"];
                    $v["setup_fee"] = $pricing["tsetupfee"];
                    $v["billingcycle"] = "triennially";
                    $v["billingcycle_zh"] = lang("TRIENNIALLY");
                } else if (0 <= $pricing["fourly"]) {
                    $v["product_price"] = $pricing["fourly"];
                    $v["setup_fee"] = $pricing["foursetupfee"];
                    $v["billingcycle"] = "fourly";
                    $v["billingcycle_zh"] = lang("FOURLY");
                } else if (0 <= $pricing["fively"]) {
                    $v["product_price"] = $pricing["fively"];
                    $v["setup_fee"] = $pricing["fivesetupfee"];
                    $v["billingcycle"] = "fively";
                    $v["billingcycle_zh"] = lang("FIVELY");
                } else if (0 <= $pricing["sixly"]) {
                    $v["product_price"] = $pricing["sixly"];
                    $v["setup_fee"] = $pricing["sixsetupfee"];
                    $v["billingcycle"] = "sixly";
                    $v["billingcycle_zh"] = lang("SIXLY");
                } else if (0 <= $pricing["sevenly"]) {
                    $v["product_price"] = $pricing["sevenly"];
                    $v["setup_fee"] = $pricing["sevensetupfee"];
                    $v["billingcycle"] = "sevenly";
                    $v["billingcycle_zh"] = lang("SEVENLY");
                } else if (0 <= $pricing["eightly"]) {
                    $v["product_price"] = $pricing["eightly"];
                    $v["setup_fee"] = $pricing["eightsetupfee"];
                    $v["billingcycle"] = "eightly";
                    $v["billingcycle_zh"] = lang("EIGHTLY");
                } else if (0 <= $pricing["ninely"]) {
                    $v["product_price"] = $pricing["ninely"];
                    $v["setup_fee"] = $pricing["ninesetupfee"];
                    $v["billingcycle"] = "ninely";
                    $v["billingcycle_zh"] = lang("NINELY");
                } else if (0 <= $pricing["tenly"]) {
                    $v["product_price"] = $pricing["tenly"];
                    $v["setup_fee"] = $pricing["tensetupfee"];
                    $v["billingcycle"] = "tenly";
                    $v["billingcycle_zh"] = lang("TENLY");
                } else {
                    $v["product_price"] = 0;
                    $v["setup_fee"] = 0;
                    $v["billingcycle"] = "";
                    $v["billingcycle_zh"] = lang("PRICE_CONFIG_ERROR");
                }
            } else {
                $v["product_price"] = 0;
                $v["setup_fee"] = 0;
                $v["billingcycle"] = "";
                $v["billingcycle_zh"] = lang("PRICE_NO_CONFIG");
            }
            if ($paytype["pay_type"] == "recurring" && in_array($v["type"], array_keys(config("developer_app_product_type"))) && 0 < $pricing["annually"]) {
                $v["product_price"] = $pricing["annually"];
                $v["setup_fee"] = $pricing["asetupfee"];
                $v["billingcycle"] = "annually";
                $v["billingcycle_zh"] = lang("ANNUALLY");
            }
            $v["product_price"] = bcadd($v["setup_fee"], $v["product_price"], 2);
            $cart_logic = new \app\common\logic\Cart();
            $rebate_total = 0;
            $config_total = $cart_logic->getProductDefaultConfigPrice($v["id"], $currencyid, $v["billingcycle"], $rebate_total);
            $rebate_total = bcadd($v["product_price"], $rebate_total, 2);
            $v["product_price"] = bcadd($v["product_price"], $config_total, 2);
            if ($v["api_type"] == "zjmf_api" && 0 < $v["upstream_version"] && $v["upstream_price_type"] == "percent") {
                $v["product_price"] = bcmul($v["product_price"], $v["upstream_price_value"] / 100, 2);
                if ($v["ontrial"] == 1) {
                    $v["ontrial_price"] = bcmul($v["ontrial_price"], $v["upstream_price_value"] / 100, 2);
                    $v["ontrial_setup_fee"] = bcmul($v["ontrial_setup_fee"], $v["upstream_price_value"] / 100, 2);
                }
                $rebate_total = bcmul($rebate_total, $v["upstream_price_value"] / 100, 2);
            }
            if ($v["api_type"] == "resource") {
                $grade = resourceUserGradePercent($uid, $v["id"]);
                $v["product_price"] = bcmul($v["product_price"], $grade / 100, 2);
                if ($v["ontrial"] == 1) {
                    $v["ontrial_price"] = bcmul($v["ontrial_price"], $grade / 100, 2);
                    $v["ontrial_setup_fee"] = bcmul($v["ontrial_setup_fee"], $grade / 100, 2);
                }
                $rebate_total = bcmul($rebate_total, $grade / 100, 2);
            }
            $flag = getSaleProductUser($v["id"], $uid);
            $v["bates"] = 0;
            $v["sale_price"] = $v["bates"];
            $v["has_bates"] = 0;
            $v["flag"] = $flag["type"] ?? 0;
            $v["uid"] = $uid;
            if ($flag) {
                if ($flag["type"] == 1) {
                    $bates = bcdiv($flag["bates"], 100, 2);
                    $rebate = bcmul($rebate_total, 1 - $bates, 2) < 0 ? 0 : bcmul($rebate_total, 1 - $bates, 2);
                    $v["sale_price"] = bcsub($v["product_price"], $rebate, 2) < 0 ? 0 : bcsub($v["product_price"], $rebate, 2);
                    $v["bates"] = bcmul($v["product_price"], 1 - $bates, 2);
                } else if ($flag["type"] == 2) {
                    $bates = $flag["bates"];
                    $rebate = $rebate_total < $bates ? $rebate_total : $bates;
                    $v["sale_price"] = bcsub($v["product_price"], $rebate, 2) < 0 ? 0 : bcsub($v["product_price"], $rebate, 2);
                    $v["bates"] = $bates;
                }
                $v["has_bates"] = 1;
            }
        }
        $payType = json_decode($v["pay_type"], true)["pay_type"] ?? "";
        if ($payType == "recurring") {
            $v["pay_type"] = "recurring_prepayment";
        } else {
            $v["pay_type"] = $payType;
        }
        $v["price"] = bcsub($v["product_price"], $rebate ?? 0, 2);
        $v["cycle"] = $v["billingcycle_zh"];
        if ($v["billingcycle"] == "") {
            $v = [];
        }
        $logic = new \app\common\logic\Product();
        $tmp = $logic->getDetailCache($id);
        if (empty($tmp)) {
            $logic->updateDetailCache([$id]);
            $tmp = $logic->getDetailCache($id);
        }
        $v["customfields"] = $tmp[$id]["customfields"] ?? [];
        return json(["status" => 200, "msg" => "请求成功", "data" => ["product" => $v]]);
    }
    public function getUpgradeProduct()
    {
        $param = request()->param();
        $where = function (\think\db\Query $query) use ($param) {
            $id = $param["id"] ?? 0;
            $pids = \think\Db::name("product_upgrade_products")->where("product_id", $id)->column("upgrade_product_id") ?? [];
            $query->whereIn("id", $pids)->whereIn("type", ["dcim", "dcimcloud"]);
        };
        $filterproducts = \think\Db::name("products")->field("id,type,gid,name,description,pay_method,tax,order,pay_type,api_type,upstream_version,upstream_price_type,upstream_price_value,stock_control,qty")->where($where)->select()->toArray();
        $currencyid = 1;
        $uid = !empty(request()->uid) ? request()->uid : "";
        $newfilterproducts = [];
        foreach ($filterproducts as $key => $v) {
            if (!empty($v)) {
                $paytype = (array) json_decode($v["pay_type"]);
                $pricing = \think\Db::name("pricing")->where("type", "product")->where("relid", $v["id"])->where("currency", $currencyid)->find();
                if (!empty($paytype["pay_ontrial_status"])) {
                    if (0 <= $pricing["ontrial"]) {
                        $v["product_price"] = $pricing["ontrial"];
                        $v["setup_fee"] = $pricing["ontrialfee"];
                        $v["billingcycle"] = "ontrial";
                        $v["billingcycle_zh"] = lang("ONTRIAL");
                    } else {
                        $v["product_price"] = 0;
                        $v["setup_fee"] = 0;
                        $v["billingcycle"] = "";
                        $v["billingcycle_zh"] = lang("PRICE_NO_CONFIG");
                    }
                    $v["ontrial"] = 1;
                    $v["ontrial_cycle"] = $paytype["pay_ontrial_cycle"];
                    $v["ontrial_cycle_type"] = $paytype["pay_ontrial_cycle_type"] ?: "day";
                    $v["ontrial_price"] = $pricing["ontrial"];
                    $v["ontrial_setup_fee"] = $pricing["ontrialfee"];
                } else {
                    $v["ontrial"] = 0;
                }
                if ($paytype["pay_type"] == "free") {
                    $v["product_price"] = 0;
                    $v["setup_fee"] = 0;
                    $v["billingcycle"] = "free";
                    $v["billingcycle_zh"] = lang("FREE");
                } else if ($paytype["pay_type"] == "onetime") {
                    if (0 <= $pricing["onetime"]) {
                        $v["product_price"] = $pricing["onetime"];
                        $v["setup_fee"] = $pricing["osetupfee"];
                        $v["billingcycle"] = "onetime";
                        $v["billingcycle_zh"] = lang("ONETIME");
                    } else {
                        $v["product_price"] = 0;
                        $v["setup_fee"] = 0;
                        $v["billingcycle"] = "";
                        $v["billingcycle_zh"] = lang("PRICE_NO_CONFIG");
                    }
                } else if (!empty($pricing) && $paytype["pay_type"] == "recurring") {
                    if (0 <= $pricing["hour"]) {
                        $v["product_price"] = $pricing["hour"];
                        $v["setup_fee"] = $pricing["hsetupfee"];
                        $v["billingcycle"] = "hour";
                        $v["billingcycle_zh"] = lang("HOUR");
                    } else if (0 <= $pricing["day"]) {
                        $v["product_price"] = $pricing["day"];
                        $v["setup_fee"] = $pricing["dsetupfee"];
                        $v["billingcycle"] = "day";
                        $v["billingcycle_zh"] = lang("DAY");
                    } else if (0 <= $pricing["monthly"]) {
                        $v["product_price"] = $pricing["monthly"];
                        $v["setup_fee"] = $pricing["msetupfee"];
                        $v["billingcycle"] = "monthly";
                        $v["billingcycle_zh"] = lang("MONTHLY");
                    } else if (0 <= $pricing["quarterly"]) {
                        $v["product_price"] = $pricing["quarterly"];
                        $v["setup_fee"] = $pricing["qsetupfee"];
                        $v["billingcycle"] = "quarterly";
                        $v["billingcycle_zh"] = lang("QUARTERLY");
                    } else if (0 <= $pricing["semiannually"]) {
                        $v["product_price"] = $pricing["semiannually"];
                        $v["setup_fee"] = $pricing["ssetupfee"];
                        $v["billingcycle"] = "semiannually";
                        $v["billingcycle_zh"] = lang("SEMIANNUALLY");
                    } else if (0 <= $pricing["annually"]) {
                        $v["product_price"] = $pricing["annually"];
                        $v["setup_fee"] = $pricing["asetupfee"];
                        $v["billingcycle"] = "annually";
                        $v["billingcycle_zh"] = lang("ANNUALLY");
                    } else if (0 <= $pricing["biennially"]) {
                        $v["product_price"] = $pricing["biennially"];
                        $v["setup_fee"] = $pricing["bsetupfee"];
                        $v["billingcycle"] = "biennially";
                        $v["billingcycle_zh"] = lang("BIENNIALLY");
                    } else if (0 <= $pricing["triennially"]) {
                        $v["product_price"] = $pricing["triennially"];
                        $v["setup_fee"] = $pricing["tsetupfee"];
                        $v["billingcycle"] = "triennially";
                        $v["billingcycle_zh"] = lang("TRIENNIALLY");
                    } else if (0 <= $pricing["fourly"]) {
                        $v["product_price"] = $pricing["fourly"];
                        $v["setup_fee"] = $pricing["foursetupfee"];
                        $v["billingcycle"] = "fourly";
                        $v["billingcycle_zh"] = lang("FOURLY");
                    } else if (0 <= $pricing["fively"]) {
                        $v["product_price"] = $pricing["fively"];
                        $v["setup_fee"] = $pricing["fivesetupfee"];
                        $v["billingcycle"] = "fively";
                        $v["billingcycle_zh"] = lang("FIVELY");
                    } else if (0 <= $pricing["sixly"]) {
                        $v["product_price"] = $pricing["sixly"];
                        $v["setup_fee"] = $pricing["sixsetupfee"];
                        $v["billingcycle"] = "sixly";
                        $v["billingcycle_zh"] = lang("SIXLY");
                    } else if (0 <= $pricing["sevenly"]) {
                        $v["product_price"] = $pricing["sevenly"];
                        $v["setup_fee"] = $pricing["sevensetupfee"];
                        $v["billingcycle"] = "sevenly";
                        $v["billingcycle_zh"] = lang("SEVENLY");
                    } else if (0 <= $pricing["eightly"]) {
                        $v["product_price"] = $pricing["eightly"];
                        $v["setup_fee"] = $pricing["eightsetupfee"];
                        $v["billingcycle"] = "eightly";
                        $v["billingcycle_zh"] = lang("EIGHTLY");
                    } else if (0 <= $pricing["ninely"]) {
                        $v["product_price"] = $pricing["ninely"];
                        $v["setup_fee"] = $pricing["ninesetupfee"];
                        $v["billingcycle"] = "ninely";
                        $v["billingcycle_zh"] = lang("NINELY");
                    } else if (0 <= $pricing["tenly"]) {
                        $v["product_price"] = $pricing["tenly"];
                        $v["setup_fee"] = $pricing["tensetupfee"];
                        $v["billingcycle"] = "tenly";
                        $v["billingcycle_zh"] = lang("TENLY");
                    } else {
                        $v["product_price"] = 0;
                        $v["setup_fee"] = 0;
                        $v["billingcycle"] = "";
                        $v["billingcycle_zh"] = lang("PRICE_CONFIG_ERROR");
                    }
                } else {
                    $v["product_price"] = 0;
                    $v["setup_fee"] = 0;
                    $v["billingcycle"] = "";
                    $v["billingcycle_zh"] = lang("PRICE_NO_CONFIG");
                }
                if ($paytype["pay_type"] == "recurring" && in_array($v["type"], array_keys(config("developer_app_product_type"))) && 0 < $pricing["annually"]) {
                    $v["product_price"] = $pricing["annually"];
                    $v["setup_fee"] = $pricing["asetupfee"];
                    $v["billingcycle"] = "annually";
                    $v["billingcycle_zh"] = lang("ANNUALLY");
                }
                $v["product_price"] = bcadd($v["setup_fee"], $v["product_price"], 2);
                $cart_logic = new \app\common\logic\Cart();
                $rebate_total = 0;
                $config_total = $cart_logic->getProductDefaultConfigPrice($v["id"], $currencyid, $v["billingcycle"], $rebate_total);
                $rebate_total = bcadd($v["product_price"], $rebate_total, 2);
                $v["product_price"] = bcadd($v["product_price"], $config_total, 2);
                if ($v["api_type"] == "zjmf_api" && 0 < $v["upstream_version"] && $v["upstream_price_type"] == "percent") {
                    $v["product_price"] = bcmul($v["product_price"], $v["upstream_price_value"] / 100, 2);
                    if ($v["ontrial"] == 1) {
                        $v["ontrial_price"] = bcmul($v["ontrial_price"], $v["upstream_price_value"] / 100, 2);
                        $v["ontrial_setup_fee"] = bcmul($v["ontrial_setup_fee"], $v["upstream_price_value"] / 100, 2);
                    }
                    $rebate_total = bcmul($rebate_total, $v["upstream_price_value"] / 100, 2);
                }
                if ($v["api_type"] == "resource") {
                    $grade = resourceUserGradePercent($uid, $v["id"]);
                    $v["product_price"] = bcmul($v["product_price"], $grade / 100, 2);
                    if ($v["ontrial"] == 1) {
                        $v["ontrial_price"] = bcmul($v["ontrial_price"], $grade / 100, 2);
                        $v["ontrial_setup_fee"] = bcmul($v["ontrial_setup_fee"], $grade / 100, 2);
                    }
                    $rebate_total = bcmul($rebate_total, $grade / 100, 2);
                }
                $flag = getSaleProductUser($v["id"], $uid);
                $v["bates"] = 0;
                $v["sale_price"] = $v["bates"];
                $v["has_bates"] = 0;
                if ($flag) {
                    if ($flag["type"] == 1) {
                        $bates = bcdiv($flag["bates"], 100, 2);
                        $rebate = bcmul($rebate_total, 1 - $bates, 2) < 0 ? 0 : bcmul($rebate_total, 1 - $bates, 2);
                        $v["sale_price"] = bcsub($v["product_price"], $rebate, 2) < 0 ? 0 : bcsub($v["product_price"], $rebate, 2);
                        $v["bates"] = bcmul($v["product_price"], 1 - $bates, 2);
                    } else if ($flag["type"] == 2) {
                        $bates = $flag["bates"];
                        $rebate = $rebate_total < $bates ? $rebate_total : $bates;
                        $v["sale_price"] = bcsub($v["product_price"], $rebate, 2) < 0 ? 0 : bcsub($v["product_price"], $rebate, 2);
                        $v["bates"] = $bates;
                    }
                    $v["has_bates"] = 1;
                }
            }
            $payType = json_decode($v["pay_type"], true)["pay_type"] ?? "";
            if ($payType == "recurring") {
                $v["pay_type"] = "recurring_prepayment";
            } else {
                $v["pay_type"] = $payType;
            }
            $v["price"] = $v["product_price"];
            $v["cycle"] = $v["billingcycle_zh"];
            $newfilterproducts[$key] = $v;
            if ($v["billingcycle"] == "") {
                unset($newfilterproducts[$key]);
            }
        }
        $newfilterproducts = array_values($newfilterproducts);
        return json(["status" => 200, "msg" => "请求成功", "data" => ["list" => $newfilterproducts]]);
    }
    public function downloadResource()
    {
        $param = request()->param();
        $Provision = new \app\common\logic\Provision();
        $result = $Provision->downloadResource($param);
        return json($result);
    }
}

?>