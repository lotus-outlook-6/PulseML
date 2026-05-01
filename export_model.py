"""
Export the Random Forest model to pure JavaScript using m2cgen.
Also prints the label encoder classes for embedding in the frontend.
"""
import os
import joblib
import m2cgen as m2c

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model = joblib.load(os.path.join(BASE_DIR, "ml_models", "pulse_ox_model.pkl"))
encoder = joblib.load(os.path.join(BASE_DIR, "ml_models", "label_encoder.pkl"))

# Export model to JavaScript
js_code = m2c.export_to_javascript(model)

# Write to file
out_path = os.path.join(BASE_DIR, "public", "model.js")
os.makedirs(os.path.dirname(out_path), exist_ok=True)

with open(out_path, "w") as f:
    f.write("// Auto-generated Random Forest model (m2cgen)\n")
    f.write("// Input: [Heart_Rate, Oxygen_Saturation]\n")
    f.write("// Output: array of class probabilities\n\n")
    f.write(js_code)

# Print label encoder info
classes = list(encoder.classes_)
print(f"[OK] Model exported to: {out_path}")
print(f"[OK] File size: {os.path.getsize(out_path) / 1024:.1f} KB")
print(f"[OK] Label classes: {classes}")
print(f"[OK] Class order (for probability mapping): {dict(enumerate(classes))}")
