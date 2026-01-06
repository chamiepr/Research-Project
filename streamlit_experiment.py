import streamlit as st
import pandas as pd
import numpy as np
import time
import joblib
from PIL import Image
import os

# --- Page Config ---
st.set_page_config(
    page_title="Neuromarketing Experiment",
    page_icon="🧪",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# --- Custom Styling ---
st.markdown("""
<style>
    .stApp {
        background-color: #121212;
        color: #FFFFFF;
    }
    h1, h2, h3 {
        font-family: 'Inter', sans-serif;
        color: #00ADB5 !important;
    }
    .product-card {
        background-color: #1E1E1E;
        padding: 20px;
        border-radius: 15px;
        text-align: center;
        border: 1px solid #333;
        transition: transform 0.2s;
        height: 100%;
    }
    .product-card:hover {
        transform: scale(1.02);
        border-color: #00ADB5;
        box-shadow: 0 0 15px rgba(0, 173, 181, 0.3);
    }
    .price-tag {
        color: #FF2E63;
        font-weight: bold;
        font-size: 1.2rem;
        margin-top: 10px;
    }
    .stButton>button {
        width: 100%;
        background: linear-gradient(90deg, #00ADB5 0%, #00FFF5 100%);
        color: #121212;
        font-weight: bold;
        border: none;
        padding: 10px;
        margin-top: 10px;
    }
    .stButton>button:hover {
        opacity: 0.9;
    }
    /* Change label colors for Age and Gender inputs */
    .stNumberInput label, .stSelectbox label {
        color: #00ADB5 !important;
        font-size: 1.1rem;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

# --- State Management ---
if 'step' not in st.session_state:
    st.session_state.step = 0
if 'results' not in st.session_state:
    st.session_state.results = []
if 'start_time' not in st.session_state:
    st.session_state.start_time = time.time()

# --- Product Data (from Cheese_lastrun.py) ---
products = {
    1: {
        "title": "Select Cheese 🧀",
        "items": [
            {"name": "Ambewela", "price": 416, "desc": "100g - 20% OFF", "img": "ambewelacheese.jpg"}, # Approximation of names
            {"name": "Kothmale", "price": 1300, "desc": "250g", "img": "kothmale cheese.jpg"},
            {"name": "HappyCow", "price": 1200, "desc": "340g", "img": "happycow.jpeg"},
            {"name": "Kraft", "price": 2590, "desc": "250g", "img": "Kraft cheese.jpeg"},
            {"name": "Rich Life", "price": 625, "desc": "100g", "img": "richlifecheese.jpg"},
        ]
    },
    2: {
        "title": "Select Yoghurt 🥛",
        "items": [
            {"name": "Highland", "price": 70, "desc": "80g", "img": "Highland yp.jpg"},
            {"name": "Anchor", "price": 70, "desc": "80g", "img": "anchor youghurt.jpg"},
            {"name": "Ambewela", "price": 70, "desc": "80g", "img": "ambewela yoghurt.jpg"},
            {"name": "Pelawatte", "price": 50, "desc": "80g", "img": "pelawatteypughurt.jpeg"},
        ]
    },
    3: {
        "title": "Select Cooking Oil 🍳",
        "items": [
            {"name": "Fortune", "price": 1390, "desc": "1 L", "img": "fortune.jpg"},
            {"name": "Marina", "price": 1450, "desc": "675 ML", "img": "marina.jpeg"},
            {"name": "N Joy", "price": 840, "desc": "1 L", "img": "Njoy.jpg"},
        ]
    },
    4: {
        "title": "Select Chocolate 🍫",
        "items": [
            {"name": "Kandos", "price": 600, "desc": "90g", "img": "Kandos.jpeg"},
            {"name": "Ritzbury", "price": 200, "desc": "90g", "img": "ritzbury.jpg"},
            {"name": "Revello", "price": 690, "desc": "100g", "img": "revello.jpg"},
            {"name": "Cadbury", "price": 1250, "desc": "135g", "img": "cadbury.jpg"},
        ]
    },
    5: {
        "title": "Select Sausage 🌭",
        "items": [
            {"name": "Goldi", "price": 640, "desc": "250g", "img": "goldi.jpg"},
            {"name": "Elephant House", "price": 1820, "desc": "250g", "img": "elephanthousre.jpg"},
            {"name": "Keells Krest", "price": 820, "desc": "250g", "img": "krest.jpg"},
            {"name": "Pussalla", "price": 750, "desc": "250g", "img": "pussalla.jpeg"}, # Price estimated
        ]
    }
}

# --- Functions ---

def record_choice(step, product_name):
    # Calculate RT
    current_time = time.time()
    rt = current_time - st.session_state.start_time
    
    # Store
    st.session_state.results.append({
        "step": step,
        "product": product_name,
        "rt": rt
    })
    
    # Reset timer for next step
    st.session_state.start_time = time.time()
    st.session_state.step += 1
    st.rerun()

def load_ml_model():
    try:
        model = joblib.load('decision_model.pkl')
        le = joblib.load('label_encoder.pkl')
        return model, le
    except:
        return None, None

def get_image_path(filename):
    # Try to find the image in the current directory or data folder
    if os.path.exists(filename):
        return filename
    return None # Streamlit will handle None gracefully or show a placeholder

# --- Logic Flow ---

# STEP 0: INTRO
if st.session_state.step == 0:
    st.title("🛒 Consumer Preference Experiment")
    st.markdown("""
    Welcome! You will be shown a series of products. 
    Please **select the product you would most likely buy** in real life.
    
    We will analyze your detailed response patterns to understand your decision-making style.
    """)

    # --- Demographic Inputs ---
    col_d1, col_d2 = st.columns(2)
    with col_d1:
        age_input = st.number_input("Age", min_value=10, max_value=100, step=1, value=25)
    with col_d2:
        gender_input = st.selectbox("Gender", ["Male", "Female", "Other"])

    st.markdown("---")
    
    st.markdown("""
    When you are ready, click below to begin the shopping task.
    """)
    
    if st.button("Start Experiment ➤", type="primary"):
        st.session_state.age = age_input
        st.session_state.gender = gender_input
        st.session_state.start_time = time.time()
        st.session_state.step = 1
        st.rerun()

# STEPS 1-5: EXPERIMENT
elif 1 <= st.session_state.step <= 5:
    data = products[st.session_state.step]
    st.markdown(f"## {data['title']}")
    st.progress(st.session_state.step / 5)
    
    cols = st.columns(len(data['items']))
    
    for idx, item in enumerate(data['items']):
        with cols[idx]:
            # Card Container
            with st.container():
                st.markdown('<div class="product-card">', unsafe_allow_html=True)
                
                # Image
                img_path = get_image_path(item['img'])
                if img_path:
                    st.image(img_path, use_container_width=True)
                else:
                    st.warning(f"Image not found: {item['img']}")
                
                st.markdown(f"<h3>{item['name']}</h3>", unsafe_allow_html=True)
                st.markdown(f"<p>{item['desc']}</p>", unsafe_allow_html=True)
                st.markdown(f"<div class='price-tag'>Rs {item['price']}</div>", unsafe_allow_html=True)
                
                if st.button(f"Buy {item['name']}", key=f"btn_{st.session_state.step}_{idx}"):
                    record_choice(st.session_state.step, item['name'])
                    
                st.markdown('</div>', unsafe_allow_html=True)

# STEP 6: ANALYSIS
elif st.session_state.step > 5:
    st.balloons()
    st.title("🧠 Decision Analysis")
    
    # 1. Review Choices
    st.subheader("Experiment Summary")
    
    # Show Demographics
    st.caption(f"PARTICIPANT: Age {st.session_state.get('age', 'N/A')} | Gender {st.session_state.get('gender', 'N/A')}")
    
    st.write("### Your Choices")
    choice_df = pd.DataFrame(st.session_state.results)
    st.dataframe(choice_df, use_container_width=True)
    
    # 2. Predict Factor
    model, le = load_ml_model()
    
    if model:
        # We take the LAST choice (Sausage) for the prediction, similar to the original logic
        last_choice = st.session_state.results[-1]
        rt = last_choice['rt']
        
        # Simulating Gaze (Since we can't track it in Streamlit easily)
        # We assume center gaze with some noise for simulation
        gaze_x = np.random.normal(0, 0.1) 
        gaze_y = np.random.normal(0, 0.1)
        
        input_data = pd.DataFrame([{
            'reaction_time': rt,
            'gaze_x': gaze_x,
            'gaze_y': gaze_y
        }])
        
        probs = model.predict_proba(input_data)[0]
        classes = le.classes_
        
        # Display Result
        st.markdown("---")
        st.subheader("Why did you make that decision?")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.info(f"Analysis based on Reaction Time ({rt:.2f}s) and behavioral proxies.")
            import plotly.express as px
            chart_data = pd.DataFrame({
                'Factor': [c.capitalize().replace("Brand", "Quality") for c in classes],
                'Probability': probs
            })
            
            fig = px.pie(chart_data, values='Probability', names='Factor', hole=0.5,
                         title="Influencing Factors",
                         color_discrete_sequence=['#00ADB5', '#FF2E63', '#FCE38A'])
            fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font_color="white")
            st.plotly_chart(fig)
            
        with col2:
            top_factor = chart_data.loc[chart_data['Probability'].idxmax()]
            st.markdown(f"""
            <div style="background-color: #2b2d42; padding: 30px; border-radius: 15px; border-left: 5px solid #FF2E63;">
                <h2 style="margin:0;">Dominant Driver</h2>
                <h1 style="font-size: 4rem; color: #FFFFFF !important;">{top_factor['Factor']}</h1>
                <p>We predict this was the main reason for your purchase.</p>
            </div>
            """, unsafe_allow_html=True)
            
    else:
        st.error("Model not captured. Please ensure `train_model.py` has been run.")
        
    if st.button("Restart Experiment"):
        st.session_state.step = 0
        st.session_state.results = []
        st.rerun()
