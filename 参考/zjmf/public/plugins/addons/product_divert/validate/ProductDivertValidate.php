<?php
namespace addons\product_divert\validate;

class ProductDivertValidate extends think\Validate
{
    protected $rule = ["is_open" => "require|int", "validity_period" => "require|int", "push_cost" => "require|int", "pull_cost" => "require|int", "protection_period" => "require|int", "product_range" => "require|array"];
    protected $message = ["is_open" => "不能为空|只支持数字", "validity_period" => "不能为空|只支持数字", "push_cost" => "不能为空|只支持数字", "pull_cost" => "不能为空|只支持数字", "protection_period" => "不能为空|只支持数字", "product_range" => "不能为空|只支持数组"];
}

?>