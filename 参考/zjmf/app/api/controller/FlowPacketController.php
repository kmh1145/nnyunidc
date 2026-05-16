<?php
namespace app\api\controller;

class FlowPacketController
{
    public function flowPacketList()
    {
        $data = \think\Db::name("dcim_flow_packet")->field("id,name,capacity,price,allow_products,sale_times,stock")->where("status", 1)->select()->toArray();
        if (!empty($data)) {
            $productId = [];
            foreach ($data as $v) {
                $v["allow_products"] = explode(",", $v["allow_products"]);
                $productId = array_merge($productId, $v["allow_products"] ?: []);
            }
            if (!empty($productId)) {
                $product = \think\Db::name("products")->field("id,name")->whereIn("id", $productId)->select()->toArray();
                $product = array_column($product, "name", "id");
                foreach ($data as $k => $v) {
                    if ($v["stock"] == 0) {
                        $data[$k]["stock_enable"] = 0;
                    } else {
                        $data[$k]["stock_enable"] = 1;
                        $data[$k]["stock"] = max(0, $v["stock"] - $v["sale_times"]);
                    }
                    $v["allow_products"] = explode(",", $v["allow_products"]);
                    $data[$k]["product"] = [];
                    foreach ($v["allow_products"] as $vv) {
                        if (isset($product[$vv])) {
                            $data[$k]["product"][] = ["id" => (int) $vv, "name" => $product[$vv]];
                        }
                    }
                    unset($data[$k]["allow_products"]);
                    unset($data[$k]["sale_times"]);
                }
            } else {
                $data = [];
            }
        }
        $result = ["status" => 200, "msg" => "请求成功", "data" => ["list" => $data, "count" => count($data)]];
        return json($result);
    }
    public function flowPacketIndex()
    {
        $param = request()->param();
        $id = (int) $param["id"];
        $data = \think\Db::name("dcim_flow_packet")->field("id,name,capacity,price,allow_products,sale_times,stock")->where("status", 1)->where("id", $id)->find();
        if (!empty($data)) {
            if ($data["stock"] == 0) {
                $data["stock_enable"] = 0;
            } else {
                $data["stock_enable"] = 1;
                $data["stock"] = max(0, $data["stock"] - $data["sale_times"]);
            }
            $productId = explode(",", $data["allow_products"]);
            $product = [];
            if (!empty($productId)) {
                $product = \think\Db::name("products")->field("id,name")->whereIn("id", $productId)->select()->toArray();
            }
            $data["product"] = $product;
            unset($data["allow_products"]);
            unset($data["sale_times"]);
        } else {
            $data = [];
        }
        $result = ["status" => 200, "msg" => "请求成功", "data" => (object) $data];
        return json($result);
    }
}

?>