<?php
namespace addons\product_divert;

class ProductDivertPlugin extends app\admin\lib\Plugin
{
    public $info = ["name" => "ProductDivert", "title" => "产品转移", "description" => "管理用户的产品转移", "status" => 1, "author" => "顺戴网络", "version" => "1.0", "module" => "addons"];
    public function productDivertidcsmartauthorize()
    {
    }
    public function install()
    {
        $sql = ["DROP TABLE IF EXISTS `shd_product_divert`", "CREATE TABLE `shd_product_divert`  (  `id` int(10) NOT NULL AUTO_INCREMENT,  `hostid` int(10) NOT NULL COMMENT '对应转移的数据表',  `product_name` varchar(255) NOT NULL DEFAULT '' COMMENT '名称',  `product_domain` varchar(255) NOT NULL DEFAULT '' COMMENT '主机名',  `product_ip` varchar(255) NOT NULL DEFAULT '' COMMENT 'ip',  `push_userid` int(10) NOT NULL COMMENT '转出人id',  `push_username` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT '' COMMENT '转出人名称',  `pull_userid` int(10) NOT NULL COMMENT '转入人id',  `pull_username` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT '' COMMENT '转入人名称',  `create_time` int(10) NOT NULL DEFAULT 0 COMMENT '发起时间',  `end_time` int(10) NOT NULL DEFAULT 0 COMMENT '完成时间',  `due_time` int(10) NOT NULL DEFAULT 0 COMMENT '过期时间',  `push_cost` decimal(10, 2) NOT NULL DEFAULT 0 COMMENT '转出手续费',  `pull_cost` decimal(10, 2) NOT NULL DEFAULT 0 COMMENT '转入手续费',  `push_invoice_id` int(10) NOT NULL DEFAULT 0 COMMENT '转出账单id',  `pull_invoice_id` int(10) NOT NULL DEFAULT 0 COMMENT '转入账单id',  `status` enum('1','2','3','4') CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT '1' COMMENT '状态对应:待接收-已完成-已关闭-已拒绝',  PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"];
        foreach ($sql as $v) {
            \think\Db::execute($v);
        }
        return true;
    }
    public function uninstall()
    {
        $sql = "DROP TABLE IF EXISTS `shd_product_divert`";
        \think\Db::execute($sql);
        return true;
    }
    public function invoicePaid($param)
    {
        $invoiceid = intval($param["invoiceid"]);
        $uid = request()->uid;
        $res = \think\Db::name("product_divert")->alias("p")->leftJoin("invoices i", "p.pull_invoice_id=i.id")->where(["i.id" => $invoiceid, "p.pull_userid" => $uid])->field("i.status as pay_status,p.hostid,p.id,p.push_userid,p.pull_userid")->find();
        if (!$res["pay_status"] == "Paid") {
            return json(["status" => 200, "data" => 0]);
        }
        \think\Db::startTrans();
        try {
            \think\Db::name("product_divert")->where(["id" => $res["id"], "pull_userid" => $uid])->update(["status" => 2, "end_time" => time()]);
            \think\Db::name("host")->where(["id" => $res["hostid"]])->update(["uid" => $uid]);
            $invoice_logic = new \app\common\logic\Invoices();
            $invoice_logic->productDivertCancelInvoices($res["hostid"]);
            active_log_final(sprintf("转移产品和服务 - 将 - Host ID:%d - 从 - User ID:%d - 移动到 User ID:%d - 成功", $res["hostid"], $res["push_userid"], $res["pull_userid"]), $res["push_userid"], 2, $res["hostid"]);
            active_log_final(sprintf("接收到转移的产品和服务 - Host ID:%d - 来自 - User ID:%d", $res["hostid"], $res["push_userid"]), $res["pull_userid"], 2, $res["hostid"]);
            \think\Db::commit();
        } catch (\Exception $e) {
            \think\Db::rollback();
        }
        return json(["status" => 200, "data" => 1]);
    }
    public function templateAfterServicedetailSuspended($param)
    {
        $hostid = intval($param["hostid"]);
        $_config = $this->getConfig();
        if (!$_config["is_open"]) {
            return "";
        }
        $tmp = \think\Db::name("host")->where("create_time", "<=", time() - $_config["protection_period"] * 24 * 3600)->where("id", $hostid)->where("domainstatus", "Active")->find();
        if (empty($tmp)) {
            return "";
        }
        if (!in_array($tmp["productid"], $_config["product_range"])) {
            return "";
        }
        $product_divert = \think\Db::name("product_divert")->field("id")->where(["hostid" => $hostid, "status" => 1])->find();
        $url = shd_addon_url("ProductDivert://Index/pushpulllist", ["hostIdToken" => $hostid], true);
        if ($product_divert) {
            return "<a href=\"" . $url . "\" class=\"btn btn-primary h-100 custom-button text-white\" disabled>转移</a>";
        }
        return "<a href=\"" . $url . "\" class=\"btn btn-primary h-100 custom-button text-white\" >转移</a>";
    }
    public function templateAfterServiceDomainstatusSelected()
    {
        $_config = $this->getConfig();
        if (!$_config["is_open"]) {
            return "";
        }
        $uid = request()->uid;
        $count = \think\Db::name("product_divert")->where("pull_userid", $uid)->where("status", 1)->count();
        $count = intval($count);
        if (empty($count)) {
            return "";
        }
        return "<div class=\"alert alert-warning alert-dismissible\" role=\"alert\"><button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button>您有<strong>" . $count . "</strong>个产品待转入</div>";
    }
    public function afterDailyCron()
    {
        $_config = $this->getConfig();
        if (!$_config["is_open"]) {
            return NULL;
        }
        $tmp = \think\Db::name("product_divert")->where("due_time", "<=", time())->where("status", 1)->count("id");
        if (empty($tmp)) {
            return NULL;
        }
        \think\Db::name("product_divert")->where("due_time", "<=", time())->where("status", 1)->field("id,push_invoice_id,push_userid")->chunk(100, function ($pd) {
            foreach ($pd as $v) {
                \think\Db::startTrans();
                try {
                    $param["id"] = $v["id"];
                    $param["from_author"] = "SERVER";
                    model\productDivertModel::refuseDivert($param);
                    \think\Db::commit();
                } catch (\Exception $e) {
                    \think\Db::rollback();
                }
            }
        });
    }
    public function checkDivertInvoice($param)
    {
        model\productDivertModel::checkDivertInvoice($param["invoice_id"]);
        return true;
    }
    public function productDivertUpgrade($param)
    {
        model\productDivertModel::productDivertTnvoicesidUpgrade($param["id"], $param["new_id"]);
        return true;
    }
    public function productDivertDelete($param)
    {
        model\productDivertModel::productDivertTnvoicesDeleteRefuseDivert($param["id"]);
        return true;
    }
}

?>