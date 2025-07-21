# 📦 SmartPackingEngine

An AI-assisted packaging recommendation system for modern packaging centers. This project streamlines workflows by linking packaging strategies with downstream sorting devices. LLMs (Large Language Models) are used to assist in decision-making.

---

## 🧠 Background

Traditional packaging workflows often rely on static rules or manual decisions, leading to:

- Inefficient use of box space and weight  
- Inconsistent packaging strategies  
- Increased labor and decision costs  

**SmartPackingEngine** promotes a packaging-driven approach: packaging plans drive sorting and execution. With LLMs, it provides intelligent, context-aware decisions for optimal box selection and packing suggestions.

---

## 🚀 Features

- Read structured CSV data:
  - `零件尺寸表.csv` (part dimensions & weight)
  - `包装箱类型.csv` (box size & max weight)
  - `历史包装方案.csv` (historical packing records)
- Recommend suitable box types using LLMs (e.g., DeepSeek, OpenAI)
- Calculate:
  - Max items per box (volume & weight)
  - Total boxes needed
- Suggest packaging strategies (e.g., dividers, buffering)
- Simple HTML+JS frontend + Flask backend
- CORS-enabled API for integration with external systems

---

## 🧪 Tech Stack

- Python 3 + Flask  
- Pandas  
- OpenAI SDK  
- HTML + JavaScript  
- `.env` file for API key configuration  

---

## 🛠 Setup Instructions

1. 📦 Install dependencies:

```bash
pip install -r requirements.txt
````

2. 🧾 Set up `.env` file in the root directory:

```env
OPENAI_API_KEY=your-api-key
OPENAI_API_BASE=https://api.deepseek.com  # or your LLM endpoint
```

3. 📁 Ensure the following CSV files are in the project folder:

* `零件尺寸表.csv`
* `包装箱类型.csv`
* `历史包装方案.csv`

4. ▶️ Run the Flask backend:

```bash
python app.py
```

5. 🌐 Open `index.html` in your browser and start interacting with the AI assistant.

---

## 💬 Example Usage

In the web input box, enter:

```
A001 10
```

The assistant will return:

* ✅ Recommended box type
* 🧠 Reason for recommendation
* 📦 Items per box
* 📦 Total boxes needed
* 📌 Suggested packaging strategy

---

## 🔭 Vision

We aim to redefine the packaging process through:

* **Packaging-driven sorting**
* **LLM-enhanced decision-making**
* **Seamless human-computer collaboration**

This system enables smarter, more adaptive packaging centers that are optimized for cost, efficiency, and flexibility.

