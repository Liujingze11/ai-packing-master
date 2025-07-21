from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import math
import traceback
import os

app = Flask(__name__)
CORS(app)  # 允许所有域的跨域请求

print("="*50)
print("工具服务器正在启动...")
print(f"当前工作目录: {os.getcwd()}")


# 加载数据
data_loaded = True
print("加载零件尺寸表...")

try:
    item_df = pd.read_csv("零件尺寸表.csv")
    print(f"加载零件记录: {len(item_df)} 条")
except Exception as e:
    print(f"❌ 加载零件尺寸表失败: {e}")
    item_df = pd.DataFrame()
    data_loaded = False

print("加载包装箱类型...")
try:
    box_df = pd.read_csv("包装箱类型.csv")
    print(f"加载箱型记录: {len(box_df)} 种")
except Exception as e:
    print(f"❌ 加载包装箱类型失败: {e}")
    box_df = pd.DataFrame()
    data_loaded = False

print("加载历史包装方案...")
try:
    history_df = pd.read_csv("历史包装方案.csv")
    print(f"加载历史记录: {len(history_df)} 条")
except Exception as e:
    print(f"❌ 加载历史包装方案失败: {e}")
    history_df = pd.DataFrame()

@app.route("/test")
def test_tool_server():
    return jsonify({"status": "success", "message": "工具服务器运行正常"})

@app.route("/filter_boxes", methods=["POST"])
def filter_boxes():
    try:
        print("\n" + "-"*50)
        print("收到箱型过滤请求...")
        
        if not data_loaded:
            return jsonify({"error": "数据未加载成功"})
        
        data = request.json
        print(f"请求数据: {data}")
        
        item_id = data.get("item_id")
        quantity = data.get("quantity")
        
        if not item_id or quantity is None:
            return jsonify({"error": "缺少参数"})
        
        try:
            quantity = int(quantity)
        except ValueError:
            return jsonify({"error": "数量必须是整数"})
        
        print(f"零件号: {item_id}, 数量: {quantity}")

        item_row = item_df[item_df["零件号"] == item_id]
        if item_row.empty:
            print(f"❌ 零件不存在: {item_id}")
            return jsonify({"error": "零件号不存在"})

        item = item_row.iloc[0]
        print(f"零件详情: {item['零件号']}, 尺寸: {item['长度(mm)']}x{item['宽度(mm)']}x{item['高度(mm)']}, 重量: {item['重量(kg)']}kg")
        
        # 计算总体积和总重量
        item_volume = item["长度(mm)"] * item["宽度(mm)"] * item["高度(mm)"]
        total_volume = item_volume * quantity
        total_weight = item["重量(kg)"] * quantity
        print(f"总体积: {total_volume/1000000:.2f} cm³, 总重量: {total_weight:.2f} kg")

        suitable_boxes = []
        for _, row in box_df.iterrows():
            box_volume = row["内部长度(mm)"] * row["内部宽度(mm)"] * row["内部高度(mm)"]
            vol_ok = total_volume <= box_volume * 0.8
            weight_ok = total_weight <= row["最大承重(kg)"] * 0.8
            
            print(f"  检查箱型 {row['箱型']}: 体积 {'通过' if vol_ok else '失败'}, 重量 {'通过' if weight_ok else '失败'}")
            
            if vol_ok and weight_ok:
                box_data = {
                    "箱型": row["箱型"],
                    "内部长度(mm)": row["内部长度(mm)"],
                    "内部宽度(mm)": row["内部宽度(mm)"],
                    "内部高度(mm)": row["内部高度(mm)"],
                    "最大承重(kg)": row["最大承重(kg)"]
                }
                suitable_boxes.append(box_data)
        
        print(f"找到 {len(suitable_boxes)} 个合适箱型")
        return jsonify({"boxes": suitable_boxes})
    
    except Exception as e:
        print(f"❌ 过滤箱型错误: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/calculate_capacity", methods=["POST"])
def calculate_capacity():
    try:
        print("\n" + "-"*50)
        print("收到容量计算请求...")
        data = request.json
        item = data["item"]
        box = data["box"]
        
        print(f"零件: {item.get('零件号', '未知')}, 箱型: {box.get('箱型', '未知')}")
        print(f"零件尺寸: {item.get('长度(mm)', 0)}x{item.get('宽度(mm)', 0)}x{item.get('高度(mm)', 0)}")
        print(f"箱内尺寸: {box.get('内部长度(mm)', 0)}x{box.get('内部宽度(mm)', 0)}x{box.get('内部高度(mm)', 0)}")

        # 计算各方向可放置数量
        fit_l = box["内部长度(mm)"] // item["长度(mm)"] if item["长度(mm)"] > 0 else 0
        fit_w = box["内部宽度(mm)"] // item["宽度(mm)"] if item["宽度(mm)"] > 0 else 0
        fit_h = box["内部高度(mm)"] // item["高度(mm)"] if item["高度(mm)"] > 0 else 0
        
        print(f"长度方向可放: {fit_l}, 宽度方向可放: {fit_w}, 高度方向可放: {fit_h}")
        
        max_by_vol = fit_l * fit_w * fit_h
        
        # 计算重量限制
        max_by_weight = 0
        if item["重量(kg)"] > 0:
            max_by_weight = math.floor(box["最大承重(kg)"] / item["重量(kg)"])
        
        print(f"体积限制容量: {max_by_vol}, 重量限制容量: {max_by_weight}")
        
        capacity = min(max_by_vol, max_by_weight) if max_by_vol > 0 and max_by_weight > 0 else 0
        print(f"最终容量: {capacity}")
        return jsonify({"capacity": capacity})
    
    except Exception as e:
        print(f"❌ 容量计算错误: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/get_history", methods=["POST"])
def get_history():
    try:
        print("\n" + "-"*50)
        print("收到历史记录请求...")
        data = request.json
        item_id = data.get("item_id")
        print(f"请求零件历史: {item_id}")
        
        if history_df.empty:
            return jsonify({"history": []})
        
        if "零件号" not in history_df.columns:
            return jsonify({"history": []})
        
        history = history_df[history_df["零件号"] == item_id]
        records = history.to_dict(orient="records")
        print(f"找到 {len(records)} 条历史记录")
        return jsonify({"history": records})
    
    except Exception as e:
        print(f"❌ 获取历史记录错误: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("启动工具服务器 (端口 5001)")
    app.run(port=5001, debug=True, use_reloader=False)