from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import os, math, requests
from openai import OpenAI
import pandas as pd
import traceback

# 加载环境变量
load_dotenv()
app = Flask(__name__, static_folder="static")

# 配置CORS
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5000", "http://127.0.0.1:5000"],
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type"]
    }
})

print("="*50)
print("正在启动主服务器...")
print(f"当前工作目录: {os.getcwd()}")

# 加载零件数据
print("正在加载零件尺寸表...")
try:
    item_df = pd.read_csv("零件尺寸表.csv")
    print(f"成功加载 {len(item_df)} 条零件记录")
except Exception as e:
    print(f"❌ 加载零件尺寸表失败: {e}")
    item_df = pd.DataFrame()

# 初始化OpenAI客户端
client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
)
MCP_BASE = "http://127.0.0.1:5001"
print(f"工具服务器地址: {MCP_BASE}")

@app.route("/")
def serve_page():
    print("请求根路径，返回 index.html")
    return send_from_directory("static", "index.html")

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route("/test")
def test_connection():
    return jsonify({"status": "success", "message": "主服务器运行正常"})

@app.route("/recommend", methods=["POST"])
def recommend():
    try:
        print("\n" + "="*50)
        print("收到新的推荐请求...")
        data = request.json
        print(f"请求数据: {data}")
        
        tokens = data.get("message", "").strip().split()
        print(f"解析令牌: {tokens}")
        
        if len(tokens) != 2:
            print("⚠️ 输入格式错误")
            return jsonify({"response": "⚠️ 输入格式错误，应为：零件编号 数量 (例如：A001 10)"})

        item_id, qty = tokens[0], tokens[1]
        print(f"零件号: {item_id}, 数量: {qty}")
        
        # 验证数量是否为数字
        try:
            qty = int(qty)
        except ValueError:
            print("⚠️ 数量格式错误")
            return jsonify({"response": "⚠️ 数量必须是整数"})
        
        # 查找零件
        if item_df.empty:
            print("❌ 零件数据未加载")
            return jsonify({"response": "❌ 服务器数据未加载，请联系管理员"})
            
        item_row = item_df[item_df["零件号"] == item_id]
        if item_row.empty:
            print(f"❌ 未找到零件: {item_id}")
            return jsonify({"response": f"❌ 未找到零件: {item_id}"})

        item = item_row.iloc[0].to_dict()
        print(f"零件详情: {item}")

        # 获取箱型
        print(f"请求工具服务器: {MCP_BASE}/filter_boxes")
        try:
            r1 = requests.post(
                f"{MCP_BASE}/filter_boxes", 
                json={"item_id": item_id, "quantity": qty}, 
                timeout=5
            )
            r1.raise_for_status()
            boxes = r1.json().get("boxes", [])
            print(f"获取到 {len(boxes)} 个合适箱型")
        except requests.exceptions.RequestException as e:
            print(f"⚠️ 获取箱型失败: {e}")
            return jsonify({"response": f"⚠️ 工具服务连接失败: {str(e)}"})
        except Exception as e:
            print(f"⚠️ 解析箱型失败: {e}")
            return jsonify({"response": "⚠️ 解析箱型数据失败"})

        if not boxes:
            print("❌ 没有合适的箱型")
            return jsonify({"response": "❌ 没有找到合适的包装箱型"})

        # 计算每箱容量
        print("计算每箱容量...")
        valid_boxes = []
        for box in boxes:
            print(f"  处理箱型: {box.get('箱型', '未知箱型')}")
            try:
                cap_resp = requests.post(
                    f"{MCP_BASE}/calculate_capacity", 
                    json={"item": item, "box": box}, 
                    timeout=3
                )
                cap_resp.raise_for_status()
                cap_data = cap_resp.json()
                cap = cap_data.get("capacity", 0)
                
                if cap > 0:
                    print(f"    容量计算: {cap} 个/箱")
                    box["每箱可装"] = cap
                    box["需要箱数"] = math.ceil(qty / cap)
                    valid_boxes.append(box)
                else:
                    print(f"    容量为0，跳过")
            except requests.exceptions.RequestException as e:
                print(f"    容量计算失败: {e}")
        
        if not valid_boxes:
            print("❌ 所有箱型容量计算失败")
            return jsonify({"response": "❌ 所有箱型容量计算失败，无法提供推荐"})
        
        # 获取历史记录
        print(f"请求历史记录: {MCP_BASE}/get_history")
        history = "无"
        try:
            r2 = requests.post(
                f"{MCP_BASE}/get_history", 
                json={"item_id": item_id}, 
                timeout=3
            )
            r2.raise_for_status()
            history_data = r2.json()
            history = history_data.get("history", [])
            print(f"获取到 {len(history) if isinstance(history, list) else 0} 条历史记录")
        except requests.exceptions.RequestException as e:
            print(f"⚠️ 获取历史记录失败: {e}")
            history = "无"

        # 构造Prompt
        prompt = (
            "你是一名专业的包装工程师。请根据以下信息推荐最优包装方案：\n\n"
            f"【零件信息】:\n零件号: {item['零件号']}\n"
            f"尺寸: {item['长度(mm)']}mm × {item['宽度(mm)']}mm × {item['高度(mm)']}mm\n"
            f"重量: {item['重量(kg)']}kg\n"
            f"数量: {qty}个\n\n"
            "【可选箱型】:\n"
        )
        
        for i, box in enumerate(valid_boxes, 1):
            prompt += (
                f"{i}. {box.get('箱型', '未知箱型')}: "
                f"尺寸: {box.get('内部长度(mm)', '?')}×{box.get('内部宽度(mm)', '?')}×{box.get('内部高度(mm)', '?')}mm, "
                f"承重: {box.get('最大承重(kg)', '?')}kg\n"
                f"   每箱可装: {box.get('每箱可装', '?')}个, "
                f"需要箱数: {box.get('需要箱数', '?')}\n"
            )
        
        prompt += "\n【历史包装记录】:\n"
        if isinstance(history, list) and history:
            for record in history[:3]:  # 最多显示3条记录
                prompt += (
                    f"- 日期: {record.get('日期', '未知')}, "
                    f"箱型: {record.get('箱型', '未知')}, "
                    f"每箱数量: {record.get('每箱数量', '未知')}\n"
                )
        else:
            prompt += "无相关历史记录\n"
        
        prompt += (
            "\n请按以下格式输出推荐方案：\n"
            "推荐箱型：xxx\n"
            "推荐理由：xxx\n"
            "装箱方案：每箱装xx个，共需xx箱\n"
            "注意事项：xxx"
        )
        
        print(f"构造的Prompt:\n{prompt[:500]}...")  # 只打印前500字符

        # 调用OpenAI
        print("调用OpenAI API...")
        try:
            res = client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
                messages=[
                    {"role": "system", "content": "你是专业的包装方案助手，请用简洁清晰的中文回答"},
                    {"role": "user", "content": prompt}
                ],
                stream=False
            )
            reply = res.choices[0].message.content.strip()
            print(f"OpenAI响应: {reply[:200]}...")  # 只打印前200字符
        except Exception as e:
            print(f"⚠️ OpenAI调用失败: {e}")
            reply = f"⚠️ 生成推荐时出错: {str(e)}"
        
        print("返回响应给客户端")
        return jsonify({"response": reply})
    
    except Exception as e:
        print(f"❌ 严重错误: {e}")
        traceback.print_exc()
        return jsonify({"response": f"❌ 服务器内部错误: {str(e)}"})

if __name__ == "__main__":
    print("启动主服务器 (端口 5000)")
    app.run(debug=True, port=5000, use_reloader=False)