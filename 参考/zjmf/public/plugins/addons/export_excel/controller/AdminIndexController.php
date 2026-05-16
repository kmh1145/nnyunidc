<?php
namespace addons\export_excel\controller;

require "../vendor/autoload.php";
class AdminIndexController extends app\admin\controller\PluginAdminBaseController
{
    private $_config = [];
    public function initialize()
    {
        parent::initialize();
        if (file_exists(dirname(__DIR__) . "/config/config.php")) {
            $con = require dirname(__DIR__) . "/config/config.php";
        } else {
            $con = [];
        }
        $this->_config = array_merge($con, $this->getPlugin()->getConfig());
    }
    public function index()
    {
        $limit = config("limit") ?: 10;
        $this->assign("limit", $limit);
        $this->assign("Title", "导出列表");
        return $this->fetch("/index", []);
    }
    public function getExportList()
    {
        try {
            $config = $this->_config["list"];
            $model = \think\Db::name("export_plugin");
            $count = $model->count();
            $list = $model->order("id", "desc")->select()->toArray();
            $_list = array_map(function ($v) use ($config) {
                if (!trim($v["ep_param"])) {
                    $v["name"] = $config[$v["name"]]["name"];
                    $v["ep_param"] = [];
                    return $v;
                }
                $ep_param = explode(",", $v["ep_param"]);
                $v["ep_param"] = [];
                foreach ($ep_param as $val) {
                    $v["ep_param"][$val] = isset($config[$v["name"]][$v["name"]][$val]) ? $config[$v["name"]][$v["name"]][$val] : "字段不存在";
                }
                $v["name"] = $config[$v["name"]]["name"];
                return $v;
            }, $list);
            return json(["status" => 200, "total" => $count, "rows" => $_list]);
        } catch (\Throwable $e) {
            return json(["status" => 400, "msg" => $e->getMessage()]);
        }
    }
    public function getExportName()
    {
        try {
            $config = $this->_config["list"];
            $model = [];
            foreach ($config as $key => $val) {
                $model[$key] = $val["name"];
            }
            return json(["status" => 200, "data" => $model]);
        } catch (\Throwable $e) {
            return json(["status" => 400, "msg" => $e->getMessage()]);
        }
    }
    public function getExportParam()
    {
        try {
            $param = $this->request->param();
            $config = $this->_config["list"];
            if (!$config[$param["id"]]) {
                return json(["status" => 200, "data" => []]);
            }
            return json(["status" => 200, "data" => $config[$param["id"]][$param["id"]]]);
        } catch (\Throwable $e) {
            return json(["status" => 400, "msg" => $e->getMessage()]);
        }
    }
    public function addExport()
    {
        try {
            $param = $this->request->param();
            if (empty($param["exportParam"])) {
                throw new \think\Exception("请选择导出选项");
            }
            if (!trim($param["cname"])) {
                throw new \think\Exception("规则名称必填");
            }
            if (48 < strlen(trim($param["cname"]))) {
                throw new \think\Exception("规则名称不能超过48个字符！");
            }
            $result = \think\Db::name("export_plugin")->field("id")->where("custom_name", trim($param["cname"]))->find();
            if ($result && ($param["id"] && $result["id"] != $param["id"] || !$param["id"])) {
                throw new \think\Exception("规则名称已存在，请重新填写");
            }
            $dbFun = "insert";
            $data = ["custom_name" => trim($param["cname"]) ?: "自定义规则", "name" => trim($param["exportName"]), "ep_param" => trim(implode(",", $param["exportParam"]))];
            if ($param["id"]) {
                $data["id"] = $param["id"];
                $dbFun = "update";
            }
            $model = \think\Db::name("export_plugin")->{$dbFun}($data);
            return json(["status" => 200, "msg" => "", "data" => $model]);
        } catch (\Throwable $e) {
            return json(["status" => 400, "msg" => $e->getMessage()]);
        }
    }
    public function getEditExport()
    {
        try {
            $param = $this->request->param();
            if (!$param["id"]) {
                throw new \think\Exception("导出项不存在");
            }
            $model = \think\Db::name("export_plugin")->find($param["id"]);
            if (!$model) {
                throw new \think\Exception("导出项不存在");
            }
            $model["ep_param"] = explode(",", $model["ep_param"]);
            $config = $this->_config["list"];
            $cname = [];
            foreach ($config as $key => $val) {
                $cname[$key] = $val["name"];
            }
            $data = ["cname" => $cname, "model" => $model, "exportParam" => $config[$model["name"]][$model["name"]]];
            return json(["status" => 200, "msg" => "success", "data" => $data]);
        } catch (\Throwable $e) {
            return json(["status" => 400, "msg" => $e->getMessage()]);
        }
    }
    public function delExport()
    {
        try {
            $param = $this->request->param();
            $model = \think\Db::name("export_plugin")->where("id", $param["id"])->delete();
            return json(["status" => 200, "msg" => ""]);
        } catch (\Throwable $e) {
            return json(["status" => 400, "msg" => $e->getMessage()]);
        }
    }
    public function addExportParam()
    {
        try {
            $param = $this->request->param();
            $model = \think\Db::name("export_plugin")->field("id, name, ep_param")->where("id", $param["exportName"])->find();
            if (!$model) {
                return json(["status" => 200, "data" => []]);
            }
            $add_ep_param = array_merge(explode(",", $model["ep_param"]), [$param["exportParam"]]);
            \think\Db::name("export_plugin")->where("id", $param["exportName"])->update(["ep_param" => implode(",", $add_ep_param)]);
            return json(["status" => 200, "msg" => ""]);
        } catch (\Throwable $e) {
            return json(["status" => 400, "msg" => $e->getMessage()]);
        }
    }
    public function delExportParam()
    {
        try {
            $param = $this->request->param();
            $model = \think\Db::name("export_plugin")->field("id, name, ep_param")->where("id", $param["id"])->find();
            if (!$model) {
                return json(["status" => 200, "data" => []]);
            }
            $add_ep_param = array_diff(explode(",", $model["ep_param"]), [$param["param"]]);
            \think\Db::name("export_plugin")->where("id", $param["id"])->update(["ep_param" => implode(",", $add_ep_param)]);
            return json(["status" => 200, "msg" => ""]);
        } catch (\Throwable $e) {
            return json(["status" => 400, "msg" => $e->getMessage()]);
        }
    }
    public function achievementFun()
    {
        $param = $this->request->param();
        $id = cmf_get_current_admin_id();
        $model = \think\Db::name("user")->where("all_sale", 1)->find($id);
        if ($model) {
            $id = \think\Db::name("user")->where("is_sale", 1)->column("id");
        }
        if (!is_array($id)) {
            $id = [$id];
        }
        $id = "(" . implode(",", $id) . ")";
        $time_where = "";
        if ($param["startAt"]) {
            $time_where .= " AND A.paid_time >= " . strtotime($param["startAt"]);
        }
        if ($param["endAt"]) {
            $time_where .= " AND A.paid_time <= " . strtotime($param["endAt"] . " 23:59:59");
        }
        $sql = "            SELECT-- 账单编号\r\n            A.id as bill_num,-- 产品名称\r\n            E.name as pd_name,\r\n            D.domain as croom,-- 业务经理名称\r\n            G.user_nickname as pname,\r\n            F.username as g_name,-- 独立ip\r\n            D.dedicatedip as cip,-- 分配的id\r\n            D.assignedips,-- 付款方式\r\n            D.payment as paytype,-- 收款金额\r\n            A.subtotal as amount,-- 支付时间\r\n            A.paid_time as mount_at \r\n            FROM\r\n                shd_invoices AS A\r\n                JOIN shd_invoice_items AS B ON B.invoice_id = A.id\r\n                JOIN shd_upgrades AS C ON C.id = B.rel_id\r\n                JOIN shd_host AS D ON C.relid = D.id\r\n                JOIN shd_products AS E ON D.productid = E.id\r\n                JOIN shd_clients AS F ON F.id = A.uid\r\n                JOIN shd_user AS G ON G.id = F.sale_id \r\n                WHERE\r\n                A.`status` = 'Paid' \r\n                AND A.delete_time = 0 \r\n                AND F.sale_id in " . $id . " \r\n                AND A.type = 'upgrade' \r\n                " . $time_where . "\r\n            GROUP BY\r\n                A.id UNION\r\n                SELECT-- 账单编号\r\n                A.id as bill_num,-- 产品名称\r\n                E.name as pd_name,\r\n                D.domain as croom,-- 业务经理名称\r\n                G.user_nickname as pname,\r\n                F.username as g_name,-- 独立ip\r\n                D.dedicatedip as cip,-- 分配的id\r\n                D.assignedips,-- 付款方式\r\n                D.payment as paytype,-- 收款金额\r\n                A.subtotal as amount,-- 支付时间\r\n                A.paid_time as mount_at \r\n            FROM\r\n                shd_invoices AS A\r\n                INNER JOIN shd_invoice_items AS B ON B.invoice_id = A.id\r\n                INNER JOIN shd_host AS D ON B.rel_id = D.id\r\n                INNER JOIN shd_products AS E ON D.productid = E.id\r\n                INNER JOIN shd_clients AS F ON F.id = A.uid\r\n                JOIN shd_user AS G ON G.id = F.sale_id \r\n                JOIN shd_credit AS H ON H.relid = A.id \r\n                WHERE\r\n                A.`status` = 'Paid' \r\n                AND A.delete_time = 0 \r\n                AND F.sale_id in " . $id . " \r\n                AND B.type IN ( 'host', 'renew', 'zjmf_flow_packet', 'zjmf_reinstall_times' ) \r\n                " . $time_where . "\r\n            GROUP BY\r\n                A.id\r\n";
        $data = \think\Db::query($sql);
        if (empty($data)) {
            return [];
        }
        $credit_data = \think\Db::name("credit")->field("sum(amount) as hAmount, relid")->where("description LIKE 'Credit Removed from Invoice%' OR description LIKE 'Credit Applied to Invoice%'")->whereIn("relid", array_column($data, "bill_num"))->group("relid")->select()->toArray();
        if (!empty($credit_data)) {
            $credit_data = array_column($credit_data, "hAmount", "relid");
        }
        $pluginModel = new \app\admin\model\PluginModel();
        $pay_arr = $pluginModel->getList("gateways");
        $pay_name = array_column(array_map(function ($v) {
            return json_decode(json_encode($v), true);
        }, $pay_arr), "title", "name");
        foreach ($data as $key => $val) {
            $data[$key]["mount_at"] = date("Y/m/d H:i:s", $val["mount_at"]);
            $data[$key]["paytype"] = $pay_name[$data[$key]["paytype"]] ?? "未知的支付方式";
            $hAmount = $credit_data[$val["bill_num"]] ?? 0;
            $data[$key]["stream"] = $data[$key]["amount"] - $hAmount;
            $data[$key]["balance"] = $hAmount;
        }
        return $data;
    }
    public function billPay()
    {
        try {
            $param = $this->request->param();
            $data = \think\Db::name("invoices")->alias("i")->field("c.username as g_name,p.name as pd_name,i.id as bill_num,i.payment as paytype,u.user_nickname as pname,h.dedicatedip as cip,h.domain as croom,i.subtotal as amount,i.paid_time as mount_at")->leftJoin("invoice_items in", "in.invoice_id=i.id")->leftJoin("host h", "h.id=in.rel_id")->leftJoin("products p", "p.id=h.productid")->leftjoin("clients c", "c.id=i.uid")->leftjoin("user u", "u.id=c.sale_id")->leftJoin("currencies cu", "cu.id = c.currency")->group("i.id")->where("i.delete_time", 0)->where("i.status", "Paid");
            if ($param["startAt"]) {
                $data->whereTime("i.paid_time", ">=", $param["startAt"]);
            }
            if ($param["endAt"]) {
                $data->whereTime("i.paid_time", "<=", $param["endAt"] . " 23:59:59");
            }
            $data = $data->select()->toArray();
            if (empty($data)) {
                return [];
            }
            $credit_data = \think\Db::name("credit")->field("sum(amount) as hAmount, relid")->where("description LIKE 'Credit Removed from Invoice%' OR description LIKE 'Credit Applied to Invoice%'")->whereIn("relid", array_column($data, "bill_num"))->group("relid")->select()->toArray();
            if (!empty($credit_data)) {
                $credit_data = array_column($credit_data, "hAmount", "relid");
            }
            $pluginModel = new \app\admin\model\PluginModel();
            $pay_arr = $pluginModel->getList("gateways");
            $pay_name = array_column(array_map(function ($v) {
                return json_decode(json_encode($v), true);
            }, $pay_arr), "title", "name");
            foreach ($data as $key => $val) {
                $data[$key]["mount_at"] = date("Y/m/d H:i:s", $val["mount_at"]);
                $data[$key]["paytype"] = $pay_name[$data[$key]["paytype"]] ?? "未知的支付方式";
                $hAmount = $credit_data[$val["bill_num"]] ?? 0;
                $data[$key]["stream"] = $data[$key]["amount"] - $hAmount;
                $data[$key]["balance"] = $hAmount;
            }
            return $data;
        } catch (\Throwable $e) {
            return [];
        }
    }
    public function exportExcel()
    {
        try {
            $param = $this->request->param();
            $config = $this->_config["list"];
            if (!$param["id"]) {
                throw new \think\Exception("请指定导出数据");
            }
            $model = \think\Db::name("export_plugin")->where("id", $param["id"])->find();
            if (!$model) {
                throw new \think\Exception("导出数据不存在");
            }
            if (!trim($model["ep_param"])) {
                throw new \think\Exception("导出字段为空");
            }
            $data = $this->{$config}[$model["name"]]["getDataFun"]();
            if (empty($data)) {
                throw new \think\Exception("导出数据为空");
            }
            $ep_param = explode(",", trim($model["ep_param"]));
            $ep_param_name = $config[$model["name"]][$model["name"]];
            return $this->export($data, $ep_param, $ep_param_name, $config[$model["name"]]["name"]);
        } catch (\Throwable $e) {
            return $this->fetch("/error", ["status" => 400, "msg" => $e->getMessage()]);
        }
    }
    public function export($info, $ep_param, $ep_param_name = "", $title = "")
    {
        try {
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle($title);
            $sheet->mergeCells("A1:" . $this->_config["index"][count($ep_param)] . "1");
            $sheet->setCellValueByColumnAndRow(1, 1, $title);
            $k = 2;
            for ($i = 1; $i <= count($ep_param); $i++) {
                $sheet->setCellValue($this->_config["index"][$i] . $k, $ep_param_name[$ep_param[$i - 1]]);
            }
            $k = 3;
            foreach ($info as $key => $value) {
                foreach ($ep_param as $ks => $val) {
                    $sheet->setCellValue($this->_config["index"][$ks + 1] . $k, $value[$ep_param[$ks]]);
                }
                $k++;
            }
            $file_name = date("YmdHis", time());
            $file_name = $file_name . ".xlsx";
            header("Content-Type: application/vnd.ms-excel");
            header("Content-Disposition: attachment;filename=\"" . $file_name . "\"");
            header("Cache-Control: max-age=0");
            $writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, "Xlsx");
            $writer->save("php://output");
            exit;
        } catch (\Throwable $e) {
            active_log("msg:" . $e->getMessage() . "|file" . $e->getFile() . "|line: " . $e->getLine());
            return json(["status" => 400, "msg" => $e->getMessage()]);
        }
    }
    public function demo($data = "", $ep_param = "", $ep_param_name = "", $title = "")
    {
        try {
            $ep_param = ["name", "age", "address"];
            $ep_param_name = ["name" => "名称", "age" => "年龄", "address" => "住址"];
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle("12323432");
            $sheet->setCellValueByColumnAndRow(1, 1, $title);
            $k = 2;
            $sheet->setCellValue("A" . $k, "年龄1");
            $sheet->setCellValue("B" . $k, "年龄");
            $sheet->setCellValue("C" . $k, "身份");
            $sheet->setCellValue("D" . $k, "住址");
            $info = [["name" => "阿修罗", "age" => "11", "identity" => "杀手", "address" => "地狱"], ["name" => "释迦摩尼", "age" => ">&", "identity" => "传销", "address" => "西方"], ["name" => "李世民", "age" => "60", "identity" => "皇帝", "address" => "洛阳"], ["name" => "朱元璋", "age" => "70", "identity" => "乞丐", "address" => "朱庄"]];
            $k = 3;
            foreach ($info as $key => $value) {
                $sheet->setCellValue("A" . $k, $value["name"]);
                $sheet->setCellValue("B" . $k, $value["age"]);
                $sheet->setCellValue("C" . $k, $value["identity"]);
                $sheet->setCellValue("D" . $k, $value["address"]);
                $k++;
            }
            $file_name = date("Y-m-d", time()) . rand(1000, 9999);
            $file_name = $file_name . ".xlsx";
            header("Content-Type: application/vnd.ms-excel");
            header("Content-Disposition: attachment;filename=\"" . $file_name . "\"");
            header("Cache-Control: max-age=0");
            $writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, "Xlsx");
            $writer->save("php://output");
            exit;
        } catch (\Throwable $e) {
            echo $e->getMessage();
            echo $e->getLine();
        }
    }
}

?>