<?php
namespace addons\expired_auto_delete_bill;

class ExpiredAutoDeleteBillPlugin extends app\admin\lib\Plugin
{
    public $info = ["name" => "ExpiredAutoDeleteBill", "title" => "产品到期自动删除账单", "description" => "产品到期删除的自动删除/取消账单", "status" => 1, "author" => "顺戴网络", "version" => "1.0", "module" => "addons", "lang" => ["chinese" => "产品到期自动删除账单", "chinese_tw" => "產品到期自動删除帳單", "english" => "Automatically delete the bill when the product expires"]];
    public function expiredAutoDeleteBillidcsmartauthorize()
    {
    }
    public function install()
    {
        $sql = ["DROP TABLE IF EXISTS `shd_expired_auto_delete_bill`", "CREATE TABLE `shd_expired_auto_delete_bill` (  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,  `hostid` int(11) NOT NULL DEFAULT '0' COMMENT '产品ID',  `domain` varchar(255) NOT NULL DEFAULT '' COMMENT '主机名',  `dedicatedip` text NOT NULL DEFAULT '' COMMENT '独立ip地址',  `assignedips` text NOT NULL DEFAULT '' COMMENT '分配的ip地址',  `invoiceid` int(11) NOT NULL DEFAULT '0' COMMENT '账单ID',  `status` varchar(32) NOT NULL DEFAULT '' COMMENT '状态',  `create_time` int(11) NOT NULL DEFAULT '0' COMMENT '创建时间',  PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8"];
        foreach ($sql as $v) {
            \think\Db::execute($v);
        }
        return true;
    }
    public function uninstall()
    {
        $sql = ["DROP TABLE IF EXISTS `shd_expired_auto_delete_bill`"];
        foreach ($sql as $v) {
            \think\Db::execute($v);
        }
        return true;
    }
    public function afterModuleTerminate($param)
    {
        $params = $param["params"];
        $hostid = $params["hostid"];
        $invoice_items = \think\Db::name("invoice_items")->alias("a")->field("a.invoice_id")->leftjoin("invoices b", "b.id=a.invoice_id")->where("a.rel_id", $hostid)->whereIn("a.type", ["host", "renew"])->where("b.status", "Unpaid")->select()->toArray();
        $invoice_id = array_unique(array_column($invoice_items, "invoice_id"));
        foreach ($invoice_id as $key => $value) {
            $invoice_items = \think\Db::name("invoice_items")->where("invoice_id", $value)->whereIn("type", ["host", "renew"])->select()->toArray();
            $rel_id = array_unique(array_column($invoice_items, "rel_id"));
            if (1 < count($rel_id)) {
                unset($invoice_id[$key]);
            }
        }
        $invoice_id = array_values($invoice_id);
        if (0 < count($invoice_id)) {
            $res = \think\Db::name("plugin")->where("name", "ExpiredAutoDeleteBill")->find();
            $system = json_decode($res["config"], true);
            $system["expired_bill_action"] = $system["expired_bill_action"] ?: "";
            if ($system["expired_bill_action"] == "cancel") {
                $ids = $invoice_id;
                foreach ($ids as $id) {
                    $invoice = \think\Db::name("invoices")->field("uid,status")->where("id", $id)->find();
                    $invoice_status = $invoice["status"];
                    $uid = $invoice["uid"];
                    active_log_final(sprintf($this->lang["Invoice_admin_cancelled"], $uid, $id), $uid, 6, $id);
                }
                \think\Db::name("invoices")->whereIn("id", $ids)->where("delete_time", 0)->update(["status" => "Cancelled"]);
                foreach ($ids as $v) {
                    \think\Db::name("expired_auto_delete_bill")->insertGetId(["hostid" => $hostid, "domain" => $params["domain"], "dedicatedip" => $params["dedicatedip"] ?: "", "assignedips" => $params["assignedips"] ?: "", "invoiceid" => $v, "status" => "Cancelled", "create_time" => time()]);
                    hook("invoice_mark_cancelled", ["invoiceid" => $v]);
                }
            } else if ($system["expired_bill_action"] == "delete") {
                $ids = $invoice_id;
                foreach ($ids as $id) {
                    $invoice = \think\Db::name("invoices")->field("uid,status")->where("id", $id)->find();
                    $invoice_status = $invoice["status"];
                    $uid = $invoice["uid"];
                    active_log_final(sprintf($this->lang["Invoice_admin_delete"], $uid, $id), $uid, 6, $id);
                }
                $res = \think\Db::name("invoices")->whereIn("id", $ids)->delete();
                foreach ($ids as $v) {
                    \think\Db::name("expired_auto_delete_bill")->insertGetId(["hostid" => $hostid, "domain" => $params["domain"] ?: "", "dedicatedip" => $params["dedicatedip"] ?: "", "assignedips" => $params["assignedips"] ?: "", "invoiceid" => $v, "status" => "Deleted", "create_time" => time()]);
                    hook("invoice_delete", ["invoiceid" => $v]);
                }
            }
        }
    }
}

?>