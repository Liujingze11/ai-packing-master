# SmartPackingEngineer 🧠📦

An AI-powered industrial packaging assistant built with Flask + DeepSeek + pandas.

## 🔧 Features

- 📦 Recommends optimal box types based on part dimensions, weight, and material.
- 🧠 Integrates LLM (DeepSeek AI) to generate intelligent packing suggestions.
- 📊 Historical data reference to improve packing strategy.

## 📁 Project Structure

- `app.py` — Main Flask app with REST API
- `零件尺寸表.csv` — Part dimension & weight table
- `包装箱类型.csv` — Box types and limits
- `历史包装方案.csv` — Previous packing records
- `requirements.txt` — Python dependencies

## 🚀 Quick Start

```bash
pip install -r requirements.txt
python app.py
