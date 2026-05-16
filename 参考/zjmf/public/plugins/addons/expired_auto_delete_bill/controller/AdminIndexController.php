<?php
namespace addons\expired_auto_delete_bill\controller;

class AdminIndexController extends app\admin\controller\PluginAdminBaseController
{
    private $_config = [];
    private $lang;
    public function initialize()
    {
        parent::initialize();
        if (file_exists(dirname(__DIR__) . "/config/config.php")) {
            $con = require dirname(__DIR__) . "/config/config.php";
        } else {
            $con = [];
        }
        $this->_config = array_merge($con, $this->getPlugin()->getConfig());
        $lang = request()->languagesys;
        if (empty($lang)) {
            $lang = configuration("language") ? configuration("language") : config("default_lang");
        }
        if ($lang == "CN") {
            $lang = "chinese";
        } else if ($lang == "US") {
            $lang = "english";
        } else if ($lang == "HK") {
            $lang = "chinese_tw";
        }
        $this->lang = $lang;
    }
    public function index()
    {
        $params = $this->request->param();
        $page = !empty($params["page"]) ? intval($params["page"]) : config("page");
        $limit = 10;
        $res = \think\Db::name("expired_auto_delete_bill")->order("create_time", "DESC")->page($page)->limit($limit)->select()->toArray();
        foreach ($res as $key => &$value) {
            if ($value["status"] == "Cancelled") {
                $value["color"] = "#808080";
                $value["status_zh"] = "已取消";
            } else if ($value["status"] == "Deleted") {
                $value["color"] = "#999999";
                $value["status_zh"] = "已删除";
            }
            $value["create_time"] = date("Y-m-d H:i:s", $value["create_time"]);
            $value["url"] = $this->request->domain() . "/" . adminAddress() . "#/bill-detail?id=" . $value["invoiceid"];
        }
        $count = \think\Db::name("expired_auto_delete_bill")->count("id");
        $page_info = [];
        $page_info["count"] = $count;
        $page_info["limit"] = $limit;
        $page_info["page"] = 0 < ceil($count / $limit) ? ceil($count / $limit) : 1;
        $page_info["pages"] = range(1, $page_info["page"]);
        $page_info["curPage"] = $page;
        $page_info["prev"] = 0 < $page - 1 ? $page - 1 : 1;
        $page_info["next"] = $page + 1 < $page_info["page"] ? $page + _1 : $page_info["page"];
        $this->assign("pageInfo", $page_info);
        $this->assign("list", $res);
        $this->assign("Title", "账单处理记录");
        return $this->fetch("/index");
    }
    public function setting()
    {
        $res = \think\Db::name("plugin")->where("name", "ExpiredAutoDeleteBill")->find();
        $system = json_decode($res["config"], true);
        if ($this->request->isPost()) {
            $param = $this->request->param();
            $system["expired_bill_action"] = $system["expired_bill_action"] ?: "";
            $system["expired_bill_action"] = $param["expired_bill_action"] ?: $system["expired_bill_action"];
            $dataArr["config"] = json_encode($system);
            updateConfiguration("expired_bill_action", $setting);
            if (!$res) {
                $error_msg = lang("PLUGIN_INSTALL_ERROR");
                $this->assign("ErrorMsg", $error_msg);
            } else {
                \think\Db::name("plugin")->where("name", "ExpiredAutoDeleteBill")->update($dataArr);
                $success_msg = lang("CHANGE_SUCCESS");
                $this->assign("SuccessMsg", $success_msg);
            }
        }
        $this->assign("system", $system);
        $this->assign("Title", "设置");
        return $this->fetch("/setting");
    }
}

?>