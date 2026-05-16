<?php
namespace addons\product_divert\controller\clientarea;

class IndexController extends app\home\controller\PluginHomeBaseController
{
    public function pushserver(\think\Request $request)
    {
        $param = $request->param();
        if ($this->request->isPost()) {
            \think\Db::startTrans();
            try {
                $push_data = \addons\product_divert\model\productDivertModel::checkDivertData($param);
                $param["name"] = $push_data["data"]["product"]["name"];
                $param["domain"] = $push_data["data"]["product"]["domain"];
                $param["dedicatedip"] = $push_data["data"]["product"]["dedicatedip"];
                $param["validity_period"] = $push_data["data"]["system"]["validity_period"];
                $param["push_cost"] = $push_data["data"]["system"]["push_cost"];
                $param["pull_cost"] = $push_data["data"]["system"]["pull_cost"];
                $res_divert = \addons\product_divert\model\productDivertModel::createData($param);
                $res_divert["data"]["uid"] = $param["uid"];
                $res_invoice = \addons\product_divert\model\productDivertModel::divertInvoiceID($res_divert["data"], $param);
                \think\Db::commit();
            } catch (\Exception $e) {
                \think\Db::rollback();
                $this->assign("ErrorMsg", $e->getMessage());
            }
        }
        if ($res_invoice["status"] == 200) {
            $this->assign("pay_invoice_id", $res_invoice["data"]["invoice_id"]);
        }
        $res_data = $this->data_pagedata($request, $param);
        $data["page_data"] = $res_data["page_data"];
        $data["product_divert"] = $res_data["data"];
        $data["user_now"] = $param["uid"];
        $data["Title"] = get_title_lang("title_divert_list");
        return $this->fetch("/pushpulllist", $data);
    }
    public function pullserver(\think\Request $request)
    {
        $param = $request->param();
        $param["from_author"] = "PULL";
        $product_divert = \addons\product_divert\model\productDivertModel::getRowsData($param);
        $pull_data = $product_divert["data"]["product_divert"];
        if (!$pull_data) {
            $this->assign("ErrorMsg", lang("ABNORMA_DATA"));
        }
        if ($pull_data["pay_status"] == "Unpaid") {
            $this->assign("ErrorMsg", lang("NO_OPERATION"));
        }
        if ($request->isPost()) {
            $param["product_divert_id"] = $param["id"];
            $param["from_author"] = "PULL";
            \think\Db::startTrans();
            try {
                $res_invoice = \addons\product_divert\model\productDivertModel::divertInvoiceID($param, $pull_data);
                \addons\product_divert\model\productDivertModel::pullServerDivert($param, $pull_data);
                \think\Db::commit();
            } catch (\Exception $e) {
                \think\Db::rollback();
                $this->assign("ErrorMsg", $e->getMessage());
            }
            if ($res_invoice["status"] == 200) {
                $this->assign("pay_invoice_id", $res_invoice["data"]["invoice_id"]);
            }
        }
        if ($request->isGet()) {
            $is_open_pull_div = 1 < $pull_data["pull_invoice_id"] ? 0 : 1;
            $this->assign("pull_data", $pull_data);
            $this->assign("is_open_pull_div", $is_open_pull_div);
        }
        $res_data = $this->data_pagedata($request, $param);
        $data["page_data"] = $res_data["page_data"];
        $data["product_divert"] = $res_data["data"];
        $data["user_now"] = $param["uid"];
        $data["Title"] = get_title_lang("title_divert_list");
        return $this->fetch("/pushpulllist", $data);
    }
    public function pushpulllist(\think\Request $request)
    {
        $param = $request->param();
        $uid = $param["uid"];
        $host_id_token = $param["hostIdToken"] ?? 0;
        if ($host_id_token) {
            try {
                $push_data = \addons\product_divert\model\productDivertModel::checkDivertData(["uid" => $uid, "hostid" => $host_id_token]);
            } catch (\Exception $e) {
                $this->assign("ErrorMsg", $e->getMessage());
            }
            if ($push_data["status"] == 200) {
                $this->assign("hostid", $host_id_token);
                $this->assign("push_data", $push_data["data"]);
            }
        }
        $res_data = $this->data_pagedata($request, $param);
        $data["page_data"] = $res_data["page_data"];
        $data["product_divert"] = $res_data["data"];
        $data["user_now"] = $param["uid"];
        $data["Title"] = get_title_lang("title_divert_list");
        $data["status_describe"] = lang("STATUS_DESCRIBE");
        return $this->fetch("/pushpulllist", $data);
    }
    public function pushrefuse(\think\Request $request)
    {
        $param = $request->param();
        $param["from_author"] = "PUSH";
        \think\Db::startTrans();
        try {
            \addons\product_divert\model\productDivertModel::refuseDivert($param);
            \think\Db::commit();
        } catch (\Exception $e) {
            \think\Db::rollback();
            $this->assign("ErrorMsg", $e->getMessage());
        }
        $res_data = $this->data_pagedata($request, $param);
        $data["page_data"] = $res_data["page_data"];
        $data["product_divert"] = $res_data["data"];
        $data["user_now"] = $param["uid"];
        $data["Title"] = get_title_lang("title_divert_list");
        return $this->fetch("/pushpulllist", $data);
    }
    public function pullrefuse(\think\Request $request)
    {
        $param = $request->param();
        $param["from_author"] = "PULL";
        \think\Db::startTrans();
        try {
            \addons\product_divert\model\productDivertModel::refuseDivert($param);
            \think\Db::commit();
        } catch (\Exception $e) {
            \think\Db::rollback();
            $this->assign("ErrorMsg", $e->getMessage());
        }
        $res_data = $this->data_pagedata($request, $param);
        $data["page_data"] = $res_data["page_data"];
        $data["product_divert"] = $res_data["data"];
        $data["user_now"] = $param["uid"];
        $data["Title"] = get_title_lang("title_divert_list");
        return $this->fetch("/pushpulllist", $data);
    }
    public function verificationResult(\think\Request $request)
    {
        $param = $request->param();
        $res = \think\Db::name("product_divert")->alias("p")->leftJoin("invoices i", "p.pull_invoice_id=i.id")->where(["p.id" => $param["id"], "p.pull_userid" => $param["uid"]])->field("i.status as pay_status,p.hostid")->find();
        if (!$res["pay_status"] == "Paid") {
            return json(["status" => 200, "data" => 0]);
        }
        \think\Db::startTrans();
        try {
            \think\Db::name("product_divert")->where(["id" => $param["id"], "pull_userid" => $param["uid"]])->update(["status" => 2, "end_time" => time()]);
            \think\Db::name("host")->where(["id" => $res["hostid"]])->update(["uid" => $param["uid"]]);
            $invoice_logic = new \app\common\logic\Invoices();
            $invoice_logic->productDivertCancelInvoices($res["hostid"]);
            \think\Db::commit();
        } catch (\Exception $e) {
            \think\Db::rollback();
        }
        $res_data = $this->data_pagedata($request, $param);
        $data["page_data"] = $res_data["page_data"];
        $data["product_divert"] = $res_data["data"];
        $data["user_now"] = $param["uid"];
        $data["Title"] = get_title_lang("title_divert_list");
        return $this->fetch("/pushpulllist", $data);
    }
    private function data_pagedata(\think\Request $request, $param)
    {
        $this->page_data_register($request);
        $res_product_divert = \addons\product_divert\model\productDivertModel::getList($param);
        $res_data = $res_product_divert["data"];
        $res_count = $res_product_divert["count"];
        $page_data = $this->page_data_rendering($request, $res_data, $res_count);
        return ["status" => 200, "data" => $res_product_divert["data"], "page_data" => $page_data];
    }
    private function page_data_register(\think\Request $request)
    {
        $param = $request->param();
        $page = 1 <= $param["page"] ? intval($param["page"]) : 1;
        $limit = 1 <= $param["limit"] ? intval($param["limit"]) : 20;
        $orderby = strval($param["orderby"]) ? strval($param["orderby"]) : "create_time";
        $sort = $param["sort"] ?? "DESC";
        $request->page = $page;
        $request->limit = $limit;
        $request->order = $orderby;
        $request->sort = $sort;
        return true;
    }
    private function page_data_rendering(\think\Request $request, $data, $count)
    {
        $param = $request->param();
        $page = 1 <= $param["page"] ? intval($param["page"]) : 1;
        $limit = 1 <= $param["limit"] ? intval($param["limit"]) : 20;
        $page_data["Pages"] = $this->ajaxPages($data, $limit, $page, $count);
        $page_data["Limit"] = $limit;
        $page_data["Count"] = $count;
        return $page_data;
    }
}

?>