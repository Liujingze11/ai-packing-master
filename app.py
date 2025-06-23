from flask import Flask, request, jsonify
from flask_cors import CORS

import pandas as pd
import math

from openai import OpenAI

from dotenv import load_dotenv
import os


# 初始化 Flask 和 CORS
app = Flask(__name__)
CORS(app)
load_dotenv()  # 从 .env 文件加载环境变量

# 读取数据
item_df = pd.read_csv("零件尺寸表.csv")           # 包含：零件号、长度(mm)、宽度(mm)、高度(mm)、重量(kg)、材料
box_df = pd.read_csv("包装箱类型.csv")           # 包含：箱型、内部长度(mm)、内部宽度(mm)、内部高度(mm)、最大承重(kg)
history_df = pd.read_csv("历史包装方案.csv")     # 包含：方案ID,零件号,数量,使用箱型,备注

# 初始化 AI 客户端
client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_API_BASE")
)

# 🧮 计算最大每箱可装数量（体积+重量限制）
def calculate_max_capacity(item, box):
     # //取整；math.floor向下取整
    fit_l = box["内部长度(mm)"] // item["长度(mm)"]
    fit_w = box["内部宽度(mm)"] // item["宽度(mm)"] 
    fit_h = box["内部高度(mm)"] // item["高度(mm)"]
    max_by_volume = fit_l * fit_w * fit_h
    max_by_weight = math.floor(box["最大承重(kg)"] / item["重量(kg)"])
    return min(max_by_volume, max_by_weight)


# 🧠 包装推荐逻辑（含装箱方案）
def recommend_with_ai(item_id: str, quantity: int):
    result = item_df[item_df["零件号"] == item_id] # 从 item_df 数据框中筛选出零件号为 item_id 的那一行。

    if result.empty:
        return "❌ 未找到该零件号对应的数据。"

    item = result.iloc[0] # 获取该零件的第一行数据（只有一行的话就是它自己），类型为 pd.Series。
    item_info = {
        "零件号": item["零件号"],
        "数量": quantity,
        "长度(mm)": item["长度(mm)"],
        "宽度(mm)": item["宽度(mm)"],
        "高度(mm)": item["高度(mm)"],
        "重量(kg)": item["重量(kg)"],
        "材料": item.get("材料", "未知")
    }

    # 过滤符合体积和重量要求的箱型
    def is_suitable(row):
        box_vol = row["内部长度(mm)"] * row["内部宽度(mm)"] * row["内部高度(mm)"]
        item_vol = item["长度(mm)"] * item["宽度(mm)"] * item["高度(mm)"] * quantity
        total_weight = item["重量(kg)"] * quantity
        return item_vol <= box_vol * 100 and total_weight <= row["最大承重(kg)"] * 100  # 给些余量

    suitable_boxes_df = box_df[box_df.apply(is_suitable, axis=1)]
    if suitable_boxes_df.empty:
        return "❌ 当前无可用箱型满足该零件体积与重量需求。"

    # 添加每箱可装数量
    suitable_boxes = []
    for _, box in suitable_boxes_df.iterrows():
        cap = calculate_max_capacity(item, box)
        suitable_boxes.append({
            "箱型": box["箱型"],
            "内部尺寸": f"{box['内部长度(mm)']}×{box['内部宽度(mm)']}×{box['内部高度(mm)']} mm",
            "最大承重(kg)": box["最大承重(kg)"],
            "每箱可装数量": cap,
            "需要箱数": math.ceil(quantity / cap) if cap > 0 else "不适用"
        })

    # 获取历史记录
    history = history_df[history_df["零件号"] == item_id]
    history_data = history.to_dict(orient="records") if not history.empty else "无历史包装记录"

    # 构造 Prompt
    prompt = (
        "你是一个经验丰富的工业包装工程师。\n"
        "以下是一个零件的信息、若干个符合要求的箱型、以及该零件的历史包装方案。\n"
        "请你分析零件的体积、重量、材料，结合历史经验，从候选箱型中推荐最优一个。\n"
        "此外，请你设计装箱方案，包括：\n"
        "1）每个箱子最多能装多少个；\n"
        "2）总共需要多少个箱子；\n"
        "3）是否建议使用缓冲/分层/隔板等额外保护策略；\n\n"
        f"【零件信息】:\n{item_info}\n\n"
        f"【可选箱型列表】:\n{suitable_boxes}\n\n"
        f"【历史包装方案】:\n{history_data}\n\n"
        "请以以下格式输出：\n"
        "推荐箱型：xxx\n推荐理由：xxx\n装箱方案：\n- 每箱可装：xx\n- 总共需要：xx\n- 装箱策略建议：xxx"
    )

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "你是一名工业包装推荐系统。"},
                {"role": "user", "content": prompt}
            ],
            stream=False
        )

        # 🛡️ 容错处理：尝试提取内容
        if hasattr(response, "choices") and len(response.choices) > 0:
            message = response.choices[0].message
            if hasattr(message, "content"):
                return message.content.strip()
            else:
                return "⚠️ AI 返回中未找到有效内容字段（message.content）。"
        else:
            return "⚠️ AI 返回结构异常（无 choices）。"

    except Exception as e:
        import traceback
        traceback.print_exc()
        return f"⚠️ AI 调用失败：{str(e)}"


# 🌐 API 接口
@app.route("/recommend", methods=["POST"])
def recommend_api():
    data = request.json
    user_input = data.get("message", "").strip()
    tokens = user_input.split()

    if len(tokens) != 2:
        return jsonify({"response": "⚠️ 输入格式错误，应为：零件号 数量，例如 A001 10"})

    item_id, qty_str = tokens
    try:
        quantity = int(qty_str)
    except:
        return jsonify({"response": "⚠️ 数量必须为整数"})

    reply = recommend_with_ai(item_id, quantity)
    return jsonify({"response": reply})

# ✅ 启动服务
if __name__ == "__main__":
    app.run(debug=True)
