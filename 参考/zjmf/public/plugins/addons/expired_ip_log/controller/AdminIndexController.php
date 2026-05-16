<?php
namespace addons\expired_ip_log\controller;

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
        $keywords = !empty($params["keywords"]) ? trim($params["keywords"]) : "";
        $limit = 10;
        $res = \think\Db::name("expired_ip_log")->alias("a")->field("a.id,a.dedicatedip,a.assignedips,a.uid,a.host_create_time,a.create_time,b.username,b.email,b.phonenumber")->leftjoin("clients b", "b.id=a.uid")->where(function (\think\db\Query $query) {
            static $keywords = NULL;
            if ($keywords) {
                $query->where("a.dedicatedip|a.assignedips", "like", "%" . $keywords . "%");
            }
        })->order("create_time", "DESC")->withAttr("host_create_time", function ($value) {
            return $value ? date("Y-m-d H:i:s", $value) : "N/A";
        })->withAttr("create_time", function ($value) {
            return $value ? date("Y-m-d H:i:s", $value) : "N/A";
        })->page($page)->limit($limit)->select()->toArray();
        foreach ($res as $key => &$value) {
            $value["ip"] = [$value["dedicatedip"]];
            if (!empty($value["assignedips"])) {
                if (strpos(",", $value["assignedips"]) !== false) {
                    $value["assignedips"] = explode(",", $value["assignedips"]);
                } else {
                    $value["assignedips"] = explode("\n", $value["assignedips"]);
                }
                $value["ip"] = array_merge($value["ip"], $value["assignedips"]);
            }
            $value["ip"] = array_filter($value["ip"]);
            $value["ip"] = implode(",", $value["ip"]);
            $value["url"] = $this->request->domain() . "/" . adminAddress() . "#/customer-view/abstract?id=" . $value["uid"];
        }
        $count = \think\Db::name("expired_ip_log")->field("id")->where(function (\think\db\Query $query) {
            static $keywords = NULL;
            if ($keywords) {
                $query->where("dedicatedip|assignedips", "like", "%" . $keywords . "%");
            }
        })->count();
        $page_info = [];
        $page_info["count"] = $count;
        $page_info["limit"] = $limit;
        $page_info["page"] = 0 < ceil($count / $limit) ? ceil($count / $limit) : 1;
        $page_info["pages"] = range(1, $page_info["page"]);
        $page_info["curPage"] = $page;
        $page_info["prev"] = 0 < $page - 1 ? $page - 1 : 1;
        $page_info["next"] = $page + 1 < $page_info["page"] ? $page + _1 : $page_info["page"];
        $this->assign("keywords", $keywords);
        $this->assign("pageInfo", $page_info);
        $this->assign("list", $res);
        $this->assign("Title", "到期产品删除IP记录");
        return $this->fetch("/index");
    }
}

?>