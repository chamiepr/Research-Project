from psychopy import visual, core, event
import joblib
import pandas as pd
import numpy as np
import xgboost as xgb

def show_frontend_result():
    # 1. Setup Data for Prediction (Dummy data for demonstration)
    # in the real experiment, this comes from user inputs
    print("Simulating collected data...")
    rt_val = 2.5       # Dummy Reaction Time
    gaze_x_val = 0.2   # Dummy Gaze X
    gaze_y_val = 0.1   # Dummy Gaze Y

    # 2. Load the Model
    print("Loading model...")
    try:
        model = joblib.load('decision_model.pkl')
        le = joblib.load('label_encoder.pkl')
    except FileNotFoundError:
        print("Model files not found! Please run 'train_model.py' first.")
        return

    # 3. Predict
    input_data = pd.DataFrame([{
        'reaction_time': rt_val,
        'gaze_x': gaze_x_val,
        'gaze_y': gaze_y_val
    }])
    
    probs = model.predict_proba(input_data)[0]
    classes = le.classes_

    # 4. Generate Result Text
    result_text = "Analysis of Your Decision:\n\n"
    for i, cls in enumerate(classes):
        cls_name = cls.capitalize()
        if cls_name.lower() == 'brand': cls_name = 'Quality'
        result_text += f"{cls_name}: {probs[i]*100:.1f}%\n"

    print(f"Result text generated:\n{result_text}")

    # 5. Create "Frontend" Display (PsychoPy Window)
    win = visual.Window(
        size=(800, 600), fullscr=False, screen=0,
        winType='pyglet', allowGUI=True,
        color=(-1.0, -1.0, -1.0), colorSpace='rgb',
        units='height'
    )

    # Text Stimulus
    result_stim = visual.TextStim(win=win, name='result_text',
        text=result_text,
        font='Arial',
        pos=(0, 0), draggable=False, height=0.08, wrapWidth=None, ori=0.0, 
        color='white', colorSpace='rgb', opacity=1.0, 
        languageStyle='LTR'
    )

    # Instruction text
    instr_stim = visual.TextStim(win=win, name='instr',
        text="Press any key to exit",
        font='Arial',
        pos=(0, -0.4), height=0.03, color='gray'
    )

    # Draw loop
    print("Displaying Frontend...")
    result_stim.draw()
    instr_stim.draw()
    win.flip()

    # Wait for key press to exit
    event.waitKeys()
    
    win.close()
    core.quit()

if __name__ == "__main__":
    show_frontend_result()
