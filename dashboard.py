import streamlit as st
import pandas as pd
import numpy as np
import joblib
import plotly.express as px
import plotly.graph_objects as go

# --- Config ---
st.set_page_config(
    page_title="Neuromarketing Decision AI",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- Styling ---
st.markdown("""
<style>
    .main {
        background-color: #0e1117;
        color: #ffffff;
    }
    h1, h2, h3 {
        color: #00ADB5 !important;
        font-family: 'Inter', sans-serif;
    }
    .stButton>button {
        background-color: #00ADB5;
        color: white;
        border-radius: 10px;
        border: none;
        padding: 10px 24px;
        font-weight: bold;
    }
    .stButton>button:hover {
        background-color: #00ced1;
    }
    .metric-card {
        background-color: #262730;
        padding: 20px;
        border-radius: 10px;
        border: 1px solid #41424C;
        text-align: center;
    }
</style>
""", unsafe_allow_html=True)

# --- Load Model ---
@st.cache_resource
def load_model():
    try:
        model = joblib.load('decision_model.pkl')
        le = joblib.load('label_encoder.pkl')
        return model, le
    except Exception as e:
        return None, None

model, le = load_model()

# --- Header ---
col1, col2 = st.columns([1, 4])
with col1:
    st.image("https://img.icons8.com/nolan/96/brain--v1.png", width=80) 
with col2:
    st.title("Decision Factor Analysis")
    st.caption("Predicting the 'Why' behind consumer choices using Gaze & Behavior metrics.")

# --- Sidebar ---
st.sidebar.header("🕹️ Simulation Controls")
st.sidebar.markdown("Adjust the biometric signals to see how they affect the predicted decision driver.")

# Inputs
rt_input = st.sidebar.slider("Reaction Time (ms)", 0.0, 10.0, 2.5, 0.1, help="Time taken to make the choice")
gaze_x = st.sidebar.slider("Gaze X Position", -1.0, 1.0, 0.2, 0.01)
gaze_y = st.sidebar.slider("Gaze Y Position", -1.0, 1.0, 0.1, 0.01)

run_prediction = st.sidebar.button("Analyze Decision 🚀")

# --- Main Content ---

if not model:
    st.error("⚠️ Model not found! Please run `train_model.py` first to generate the model files.")
else:
    # Prepare Input
    input_data = pd.DataFrame([{
        'reaction_time': rt_input,
        'gaze_x': gaze_x,
        'gaze_y': gaze_y
    }])

    # --- Live Prediction ---
    with st.container():
        st.subheader("💡 Real-time Insights")
        
        # Predict
        probs = model.predict_proba(input_data)[0]
        classes = le.classes_
        
        # Format Data for Chart
        chart_data = pd.DataFrame({
            'Factor': [c.capitalize() if c.lower() != 'brand' else 'Quality' for c in classes],
            'Probability': probs
        })
        
        # Find dominant factor
        dominant_idx = np.argmax(probs)
        dominant_factor = chart_data.iloc[dominant_idx]['Factor']
        dominant_prob = probs[dominant_idx]

        # Layout: Metrics & Chart
        col_metrics, col_chart = st.columns([3, 5])
        
        with col_metrics:
            st.markdown(f"""
            <div class="metric-card">
                <h3 style="margin-bottom:0px;">Dominant Driver</h3>
                <h1 style="font-size: 3rem; margin-top:0px; color: #FF2E63 !important;">{dominant_factor}</h1>
                <p style="color:Gray;">Confidence: {dominant_prob*100:.1f}%</p>
            </div>
            """, unsafe_allow_html=True)
            
            st.write("")
            st.markdown("### Behavioral Interpretation")
            if dominant_factor == 'Price':
                st.info("User spent significant time comparing, likely evaluating value.")
            elif dominant_factor == 'Quality':
                st.success("User focused heavily on brand/product details.")
            else:
                st.warning("Decision was quick or intuitive, driven by familiarity.")

        with col_chart:
            fig = px.pie(
                chart_data, 
                values='Probability', 
                names='Factor',
                hole=0.4,
                color='Factor',
                color_discrete_map={
                    'Price': '#00ADB5',
                    'Quality': '#FF2E63',
                    'Familiarity': '#FCE38A'
                }
            )
            fig.update_layout(
                plot_bgcolor='rgba(0,0,0,0)',
                paper_bgcolor='rgba(0,0,0,0)',
                font_color="white",
                title_font_size=20,
                legend_font_size=14
            )
            st.plotly_chart(fig, use_container_width=True)

    # --- Historical Data / Dataset Preview ---
    st.divider()
    st.subheader("📁 Dataset Explore")
    try:
        df = pd.read_csv('psychopy_synthetic_dataset.csv')
        st.dataframe(df.head(), use_container_width=True)
        
        with st.expander("View Data Distribution"):
            fig_hist = px.histogram(df, x='reaction_time', color='reason', nbins=30,
                                   title="Reaction Time Distribution by Decision Factor",
                                   color_discrete_map={'price': '#00ADB5', 'brand': '#FF2E63', 'familiarity': '#FCE38A'})
            fig_hist.update_layout(
                plot_bgcolor='rgba(0,0,0,0)',
                paper_bgcolor='rgba(0,0,0,0)',
                font_color="white"
            )
            st.plotly_chart(fig_hist, use_container_width=True)
            
    except FileNotFoundError:
        st.warning("Dataset file not found.")
