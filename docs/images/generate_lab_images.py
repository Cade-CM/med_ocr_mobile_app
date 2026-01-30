"""
Lab Notebook Image Generator
Generates all diagrams and visualizations for the Med OCR Lab Notebook
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle, Circle
from matplotlib.lines import Line2D
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os

# Create output directory
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUTPUT_DIR, exist_ok=True)

def set_style():
    """Set consistent style for all plots"""
    plt.style.use('default')
    plt.rcParams['font.family'] = 'sans-serif'
    plt.rcParams['font.size'] = 10
    plt.rcParams['axes.titlesize'] = 12
    plt.rcParams['axes.labelsize'] = 10
    plt.rcParams['figure.facecolor'] = 'white'
    plt.rcParams['axes.facecolor'] = 'white'
    plt.rcParams['axes.edgecolor'] = '#333333'
    plt.rcParams['axes.grid'] = False

# =============================================================================
# 1. Preprocessing Pipeline Comparison (Before/After)
# =============================================================================
def generate_preprocessing_comparison():
    """Generate side-by-side preprocessing comparison"""
    fig, axes = plt.subplots(1, 3, figsize=(14, 5))
    
    # Simulate original image with glare
    np.random.seed(42)
    original = np.ones((200, 300)) * 0.9  # Light background
    # Add text-like dark regions
    original[40:60, 50:250] = 0.2
    original[80:100, 50:200] = 0.2
    original[120:140, 50:180] = 0.2
    original[160:180, 50:220] = 0.2
    # Add glare (bright spot)
    y, x = np.ogrid[:200, :300]
    glare_center = (100, 200)
    glare_mask = ((x - glare_center[1])**2 + (y - glare_center[0])**2) < 40**2
    original[glare_mask] = 1.0
    # Add noise
    original += np.random.normal(0, 0.05, original.shape)
    original = np.clip(original, 0, 1)
    
    # After glare clamping (threshold at 240/255 ≈ 0.94)
    glare_clamped = np.clip(original, 0, 0.94)
    
    # After contrast stretch
    contrast_stretched = (glare_clamped - 0.39) * 1.4 + 0.5  # (y - 100/255) * 1.4 + 128/255
    contrast_stretched = np.clip(contrast_stretched, 0, 1)
    
    axes[0].imshow(original, cmap='gray', vmin=0, vmax=1)
    axes[0].set_title('Original Image\n(with glare artifact)', fontweight='bold')
    axes[0].axis('off')
    
    axes[1].imshow(glare_clamped, cmap='gray', vmin=0, vmax=1)
    axes[1].set_title('After Glare Clamping\n(threshold = 240)', fontweight='bold')
    axes[1].axis('off')
    
    axes[2].imshow(contrast_stretched, cmap='gray', vmin=0, vmax=1)
    axes[2].set_title('After Contrast Stretch\n(enhanced text visibility)', fontweight='bold')
    axes[2].axis('off')
    
    # Add arrows between images
    fig.text(0.36, 0.5, '→', fontsize=30, ha='center', va='center')
    fig.text(0.64, 0.5, '→', fontsize=30, ha='center', va='center')
    
    plt.suptitle('Image Preprocessing Pipeline for OCR', fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, '01_preprocessing_comparison.png'), dpi=150, bbox_inches='tight', 
                facecolor='white', edgecolor='none')
    plt.close()
    print("✓ Generated: 01_preprocessing_comparison.png")

# =============================================================================
# 2. Otsu's Threshold Histogram
# =============================================================================
def generate_otsu_histogram():
    """Generate histogram showing bimodal distribution with Otsu threshold"""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Create bimodal distribution (text + background)
    np.random.seed(42)
    background = np.random.normal(200, 20, 5000)  # Light background pixels
    text = np.random.normal(50, 15, 2000)  # Dark text pixels
    all_pixels = np.concatenate([background, text])
    all_pixels = np.clip(all_pixels, 0, 255)
    
    # Plot histogram
    n, bins, patches = ax.hist(all_pixels, bins=50, color='#3498db', alpha=0.7, edgecolor='white')
    
    # Calculate and mark Otsu threshold (simulated at ~120)
    otsu_threshold = 118
    ax.axvline(x=otsu_threshold, color='#e74c3c', linewidth=3, linestyle='--', 
               label=f'Otsu Threshold = {otsu_threshold}')
    
    # Shade regions
    for i, patch in enumerate(patches):
        if bins[i] < otsu_threshold:
            patch.set_facecolor('#2ecc71')  # Text region (green)
            patch.set_alpha(0.7)
        else:
            patch.set_facecolor('#3498db')  # Background region (blue)
            patch.set_alpha(0.7)
    
    # Add annotations
    ax.annotate('Text Pixels\n(Foreground)', xy=(50, 200), fontsize=11, 
                ha='center', color='#27ae60', fontweight='bold')
    ax.annotate('Background Pixels', xy=(200, 300), fontsize=11, 
                ha='center', color='#2980b9', fontweight='bold')
    ax.annotate(f'Optimal Threshold\nσ²_B maximized', xy=(otsu_threshold, max(n)*0.8), 
                xytext=(otsu_threshold + 40, max(n)*0.9),
                fontsize=10, ha='left',
                arrowprops=dict(arrowstyle='->', color='#e74c3c', lw=2))
    
    ax.set_xlabel('Pixel Intensity (0-255)', fontsize=12)
    ax.set_ylabel('Frequency', fontsize=12)
    ax.set_title("Otsu's Binarization: Bimodal Histogram Analysis", fontsize=14, fontweight='bold')
    ax.legend(loc='upper right', fontsize=11)
    ax.set_xlim(0, 255)
    
    # Add formula
    formula = r'$\sigma^2_B(t) = \omega_0(t)\omega_1(t)[\mu_0(t) - \mu_1(t)]^2$'
    ax.text(0.02, 0.98, formula, transform=ax.transAxes, fontsize=12,
            verticalalignment='top', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
    
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, '02_otsu_histogram.png'), dpi=150, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close()
    print("✓ Generated: 02_otsu_histogram.png")

# =============================================================================
# 3. Prescription Label Crop Region
# =============================================================================
def generate_crop_region_diagram():
    """Generate annotated prescription label showing crop region"""
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Draw label outline
    label = FancyBboxPatch((0.05, 0.05), 0.9, 0.9, boxstyle="round,pad=0.02",
                           facecolor='white', edgecolor='black', linewidth=2)
    ax.add_patch(label)
    
    # Pharmacy header area (top 20%)
    header = Rectangle((0.05, 0.75), 0.9, 0.2, facecolor='#ffcccc', alpha=0.5, edgecolor='gray')
    ax.add_patch(header)
    ax.text(0.5, 0.85, 'PHARMACY NAME & LOGO', ha='center', va='center', fontsize=12, 
            color='gray', style='italic')
    
    # Important info area (20-50% = crop region)
    crop_region = Rectangle((0.1, 0.45), 0.8, 0.3, facecolor='#ccffcc', alpha=0.5, 
                            edgecolor='#27ae60', linewidth=3, linestyle='--')
    ax.add_patch(crop_region)
    
    # Text in crop region
    ax.text(0.15, 0.68, 'Patient: JOHN SMITH', ha='left', fontsize=11, fontweight='bold')
    ax.text(0.15, 0.60, 'METFORMIN 500MG TABLET', ha='left', fontsize=11, fontweight='bold')
    ax.text(0.15, 0.52, 'Take 1 tablet by mouth twice daily', ha='left', fontsize=10)
    
    # Auxiliary info (bottom 45%)
    bottom = Rectangle((0.05, 0.05), 0.9, 0.4, facecolor='#cce5ff', alpha=0.3, edgecolor='gray')
    ax.add_patch(bottom)
    ax.text(0.5, 0.25, 'Auxiliary Labels, Warnings,\nBarcode, Regulatory Info', 
            ha='center', va='center', fontsize=10, color='gray', style='italic')
    
    # Dimension annotations
    # Vertical dimension (height)
    ax.annotate('', xy=(0.98, 0.75), xytext=(0.98, 0.45),
                arrowprops=dict(arrowstyle='<->', color='#e74c3c', lw=2))
    ax.text(1.02, 0.60, '30%\n(crop\nheight)', ha='left', va='center', fontsize=9, color='#e74c3c')
    
    # Horizontal dimension
    ax.annotate('', xy=(0.1, 0.42), xytext=(0.9, 0.42),
                arrowprops=dict(arrowstyle='<->', color='#e74c3c', lw=2))
    ax.text(0.5, 0.38, '80% (crop width)', ha='center', fontsize=9, color='#e74c3c')
    
    # Percentage labels on sides
    ax.text(-0.02, 0.85, '0-20%', ha='right', va='center', fontsize=9)
    ax.text(-0.02, 0.60, '20-50%', ha='right', va='center', fontsize=9, fontweight='bold', color='#27ae60')
    ax.text(-0.02, 0.25, '50-100%', ha='right', va='center', fontsize=9)
    
    # Legend
    legend_elements = [
        mpatches.Patch(facecolor='#ffcccc', alpha=0.5, label='Header (excluded)'),
        mpatches.Patch(facecolor='#ccffcc', alpha=0.5, edgecolor='#27ae60', linewidth=2, 
                      linestyle='--', label='Crop Region (OCR target)'),
        mpatches.Patch(facecolor='#cce5ff', alpha=0.3, label='Footer (excluded)')
    ]
    ax.legend(handles=legend_elements, loc='upper left', bbox_to_anchor=(0.02, 0.98))
    
    ax.set_xlim(-0.1, 1.15)
    ax.set_ylim(0, 1)
    ax.set_aspect('equal')
    ax.axis('off')
    ax.set_title('Prescription Label Green-Box Crop Region\n(10-90% width × 20-50% height)', 
                fontsize=14, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, '03_crop_region_diagram.png'), dpi=150, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close()
    print("✓ Generated: 03_crop_region_diagram.png")

# =============================================================================
# 4. Dual-Pass OCR Flowchart
# =============================================================================
def generate_ocr_flowchart():
    """Generate dual-pass OCR decision flowchart"""
    fig, ax = plt.subplots(figsize=(12, 10))
    
    def draw_box(x, y, width, height, text, color='#3498db', text_color='white'):
        box = FancyBboxPatch((x - width/2, y - height/2), width, height, 
                            boxstyle="round,pad=0.03", facecolor=color, edgecolor='black', linewidth=2)
        ax.add_patch(box)
        ax.text(x, y, text, ha='center', va='center', fontsize=10, fontweight='bold', 
                color=text_color, wrap=True)
    
    def draw_diamond(x, y, size, text):
        diamond = plt.Polygon([(x, y+size), (x+size, y), (x, y-size), (x-size, y)],
                             facecolor='#f39c12', edgecolor='black', linewidth=2)
        ax.add_patch(diamond)
        ax.text(x, y, text, ha='center', va='center', fontsize=9, fontweight='bold')
    
    def draw_arrow(start, end, color='black'):
        ax.annotate('', xy=end, xytext=start,
                   arrowprops=dict(arrowstyle='->', color=color, lw=2))
    
    # Start
    draw_box(5, 9, 2.5, 0.6, 'Input Image', '#2ecc71')
    
    # Soft Pass
    draw_box(5, 7.5, 3, 0.8, 'Pass 1 (Soft)\nGrayscale + AutoContrast\n+ Median Filter', '#3498db')
    draw_arrow((5, 8.7), (5, 7.9))
    
    # OCR Soft
    draw_box(5, 6, 2.5, 0.6, 'Tesseract OCR\n(PSM 6)', '#9b59b6')
    draw_arrow((5, 7.1), (5, 6.3))
    
    # Decision
    draw_diamond(5, 4.5, 0.8, 'len(text)\n> 20?')
    draw_arrow((5, 5.4), (5, 5.3))
    
    # Yes path
    ax.text(6.2, 4.5, 'YES', fontsize=10, fontweight='bold', color='#27ae60')
    draw_arrow((5.8, 4.5), (7.5, 4.5))
    draw_box(8.5, 4.5, 2, 0.6, 'Return\nSoft Result', '#27ae60')
    
    # No path
    ax.text(5.2, 3.5, 'NO', fontsize=10, fontweight='bold', color='#e74c3c')
    draw_arrow((5, 3.7), (5, 3.2))
    
    # Hard Pass
    draw_box(5, 2.5, 3, 0.8, 'Pass 2 (Hard)\nBinary Threshold(150)\n+ Char Whitelist', '#e74c3c')
    draw_arrow((5, 3.2), (5, 2.9))
    
    # OCR Hard
    draw_box(5, 1.3, 2.5, 0.6, 'Tesseract OCR\n(PSM 6)', '#9b59b6')
    draw_arrow((5, 2.1), (5, 1.6))
    
    # Compare
    draw_diamond(5, 0, 0.8, 'Compare\nLengths')
    draw_arrow((5, 0.7), (5, 0.8))
    
    # Final outputs
    draw_box(2.5, -1.2, 2, 0.6, 'Return\nSoft Result', '#3498db')
    draw_box(7.5, -1.2, 2, 0.6, 'Return\nHard Result', '#e74c3c')
    draw_arrow((4.2, 0), (3.5, -0.6))
    draw_arrow((5.8, 0), (6.5, -0.6))
    ax.text(3.3, -0.3, 'soft ≥ hard', fontsize=9)
    ax.text(6.2, -0.3, 'hard > soft', fontsize=9)
    
    ax.set_xlim(0, 11)
    ax.set_ylim(-2, 10)
    ax.set_aspect('equal')
    ax.axis('off')
    ax.set_title('Dual-Pass OCR Decision Flow', fontsize=14, fontweight='bold', y=1.02)
    
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, '04_ocr_flowchart.png'), dpi=150, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close()
    print("✓ Generated: 04_ocr_flowchart.png")

# =============================================================================
# 5. Perspective Correction Before/After
# =============================================================================
def generate_perspective_correction():
    """Generate perspective correction visualization"""
    fig, axes = plt.subplots(1, 2, figsize=(12, 6))
    
    # Before - curved/tilted label
    ax1 = axes[0]
    # Draw trapezoid to simulate perspective distortion
    curved_label = plt.Polygon([(0.15, 0.2), (0.85, 0.25), (0.9, 0.75), (0.1, 0.8)],
                               facecolor='white', edgecolor='black', linewidth=2)
    ax1.add_patch(curved_label)
    
    # Add curved text lines (simulated)
    for i, y in enumerate([0.65, 0.55, 0.45, 0.35]):
        # Slightly curved line
        x = np.linspace(0.18, 0.78, 50)
        y_curve = y + 0.02 * np.sin(np.pi * (x - 0.18) / 0.6)
        ax1.plot(x, y_curve, 'k-', linewidth=2, alpha=0.7)
    
    # Corner points
    corners = [(0.15, 0.2), (0.85, 0.25), (0.9, 0.75), (0.1, 0.8)]
    for i, (cx, cy) in enumerate(corners):
        ax1.plot(cx, cy, 'ro', markersize=10)
        ax1.text(cx + 0.05, cy, f'P{i+1}', fontsize=10, color='red')
    
    ax1.set_xlim(0, 1)
    ax1.set_ylim(0, 1)
    ax1.set_aspect('equal')
    ax1.axis('off')
    ax1.set_title('Before: Distorted Label\n(from curved bottle surface)', fontsize=12, fontweight='bold')
    
    # After - corrected rectangle
    ax2 = axes[1]
    rect_label = Rectangle((0.1, 0.2), 0.8, 0.6, facecolor='white', edgecolor='black', linewidth=2)
    ax2.add_patch(rect_label)
    
    # Straight text lines
    for y in [0.65, 0.55, 0.45, 0.35]:
        ax2.plot([0.15, 0.85], [y, y], 'k-', linewidth=2, alpha=0.7)
    
    # Corner points
    rect_corners = [(0.1, 0.2), (0.9, 0.2), (0.9, 0.8), (0.1, 0.8)]
    for i, (cx, cy) in enumerate(rect_corners):
        ax2.plot(cx, cy, 'go', markersize=10)
        ax2.text(cx + 0.03, cy + 0.03, f"P'{i+1}", fontsize=10, color='green')
    
    ax2.set_xlim(0, 1)
    ax2.set_ylim(0, 1)
    ax2.set_aspect('equal')
    ax2.axis('off')
    ax2.set_title('After: Perspective Corrected\n(homography transform applied)', fontsize=12, fontweight='bold')
    
    # Add arrow between
    fig.text(0.5, 0.5, '→\nH', fontsize=24, ha='center', va='center', fontweight='bold')
    
    plt.suptitle('Perspective Correction for Curved Prescription Labels', fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, '05_perspective_correction.png'), dpi=150, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close()
    print("✓ Generated: 05_perspective_correction.png")

# =============================================================================
# 6. Database ER Diagram
# =============================================================================
def generate_er_diagram():
    """Generate Entity-Relationship diagram for PostgreSQL schema"""
    fig, ax = plt.subplots(figsize=(14, 10))
    
    def draw_table(x, y, name, columns, pk_count=1):
        """Draw a database table box"""
        width, height = 2.8, 0.3 * (len(columns) + 1)
        
        # Table name header
        header = FancyBboxPatch((x, y), width, 0.4, boxstyle="round,pad=0.02",
                               facecolor='#3498db', edgecolor='black', linewidth=2)
        ax.add_patch(header)
        ax.text(x + width/2, y + 0.2, name, ha='center', va='center', 
                fontsize=11, fontweight='bold', color='white')
        
        # Columns
        for i, col in enumerate(columns):
            col_y = y - 0.3 * (i + 1)
            is_pk = i < pk_count
            is_fk = 'FK' in col
            
            if is_pk:
                bg_color = '#f1c40f'  # Yellow for PK
            elif is_fk:
                bg_color = '#e8f4f8'  # Light blue for FK
            else:
                bg_color = 'white'
            
            col_box = Rectangle((x, col_y), width, 0.3, facecolor=bg_color, 
                               edgecolor='gray', linewidth=1)
            ax.add_patch(col_box)
            
            # Remove FK marker for display
            display_col = col.replace(' FK', '')
            prefix = '🔑 ' if is_pk else ('↗ ' if is_fk else '  ')
            ax.text(x + 0.1, col_y + 0.15, prefix + display_col, ha='left', va='center', fontsize=8)
        
        return y - 0.3 * len(columns)
    
    # Users table
    draw_table(1, 8, 'users', [
        'id SERIAL', 'user_key TEXT', 'email TEXT', 'display_name TEXT',
        'first_name TEXT', 'last_name TEXT', 'password_hash TEXT',
        'created_at TIMESTAMPTZ', 'updated_at TIMESTAMPTZ'
    ])
    
    # User Profiles table
    draw_table(5, 8, 'user_profiles', [
        'id SERIAL', 'user_key TEXT FK', 'nickname TEXT', 'age INTEGER',
        'gender TEXT', 'created_at TIMESTAMPTZ', 'updated_at TIMESTAMPTZ'
    ])
    
    # Medications table
    draw_table(9, 8, 'medications', [
        'id SERIAL', 'user_key TEXT FK', 'medication_key TEXT',
        'drug_name TEXT', 'strength TEXT', 'route TEXT',
        'instruction TEXT', 'frequency_text TEXT', 'qty_text TEXT',
        'refills_text TEXT', 'is_active BOOLEAN', 'created_at TIMESTAMPTZ'
    ])
    
    # Med Events table
    draw_table(5, 3.5, 'med_events', [
        'id SERIAL', 'user_key TEXT FK', 'medication_id INT FK',
        'event_time TIMESTAMPTZ', 'event_type TEXT', 'source TEXT',
        'metadata JSONB', 'created_at TIMESTAMPTZ'
    ])
    
    # User Settings table
    draw_table(1, 3.5, 'user_settings', [
        'id SERIAL', 'user_key TEXT FK', 'confirmation_window_minutes INT',
        'use_rfid_confirmation BOOL', 'created_at TIMESTAMPTZ', 'updated_at TIMESTAMPTZ'
    ])
    
    # Draw relationships
    # users -> user_profiles (1:1)
    ax.annotate('', xy=(5, 7.7), xytext=(3.8, 7.7),
               arrowprops=dict(arrowstyle='->', color='#2980b9', lw=2))
    ax.text(4.4, 7.85, '1:1', fontsize=9, color='#2980b9')
    
    # users -> medications (1:N)
    ax.annotate('', xy=(9, 7.7), xytext=(3.8, 7.4),
               arrowprops=dict(arrowstyle='->', color='#2980b9', lw=2, 
                              connectionstyle='arc3,rad=0.2'))
    ax.text(6, 8.3, '1:N', fontsize=9, color='#2980b9')
    
    # users -> user_settings (1:1)
    ax.annotate('', xy=(2.4, 3.9), xytext=(2.4, 5.1),
               arrowprops=dict(arrowstyle='->', color='#2980b9', lw=2))
    ax.text(2.5, 4.5, '1:1', fontsize=9, color='#2980b9')
    
    # users -> med_events (1:N)
    ax.annotate('', xy=(5, 3.9), xytext=(2.4, 5.3),
               arrowprops=dict(arrowstyle='->', color='#2980b9', lw=2,
                              connectionstyle='arc3,rad=-0.3'))
    ax.text(3.2, 4.9, '1:N', fontsize=9, color='#2980b9')
    
    # medications -> med_events (1:N)
    ax.annotate('', xy=(7.5, 2.8), xytext=(10.4, 4.2),
               arrowprops=dict(arrowstyle='->', color='#e74c3c', lw=2,
                              connectionstyle='arc3,rad=0.3'))
    ax.text(9.5, 3.2, '1:N', fontsize=9, color='#e74c3c')
    
    # Legend
    legend_elements = [
        mpatches.Patch(facecolor='#f1c40f', label='Primary Key (PK)'),
        mpatches.Patch(facecolor='#e8f4f8', label='Foreign Key (FK)'),
        Line2D([0], [0], color='#2980b9', lw=2, label='user_key relationship'),
        Line2D([0], [0], color='#e74c3c', lw=2, label='medication_id relationship'),
    ]
    ax.legend(handles=legend_elements, loc='lower right', fontsize=9)
    
    ax.set_xlim(0, 13)
    ax.set_ylim(0, 9)
    ax.axis('off')
    ax.set_title('PostgreSQL Database Schema - Entity Relationship Diagram', 
                fontsize=14, fontweight='bold', y=1.02)
    
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, '06_er_diagram.png'), dpi=150, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close()
    print("✓ Generated: 06_er_diagram.png")

# =============================================================================
# 7. WebSocket Sequence Diagram
# =============================================================================
def generate_websocket_sequence():
    """Generate WebSocket notification sequence diagram"""
    fig, ax = plt.subplots(figsize=(14, 10))
    
    # Actors
    actors = ['Mobile App', 'FastAPI\nBackend', 'PostgreSQL', 'WebSocket\nClients']
    actor_x = [1, 4, 7, 10]
    
    # Draw actor boxes and lifelines
    for i, (name, x) in enumerate(zip(actors, actor_x)):
        # Actor box
        box = FancyBboxPatch((x-0.8, 9), 1.6, 0.6, boxstyle="round,pad=0.02",
                            facecolor='#3498db', edgecolor='black', linewidth=2)
        ax.add_patch(box)
        ax.text(x, 9.3, name, ha='center', va='center', fontsize=10, 
                fontweight='bold', color='white')
        
        # Lifeline
        ax.plot([x, x], [9, 1], 'k--', linewidth=1, alpha=0.5)
    
    def draw_message(from_x, to_x, y, label, color='#2980b9', response=False):
        style = '<-' if response else '->'
        ax.annotate('', xy=(to_x, y), xytext=(from_x, y),
                   arrowprops=dict(arrowstyle=style, color=color, lw=2))
        mid_x = (from_x + to_x) / 2
        offset = 0.15 if not response else -0.15
        ax.text(mid_x, y + offset, label, ha='center', va='bottom' if not response else 'top',
                fontsize=9, color=color)
    
    # Sequence of events
    y = 8.3
    
    # 1. Create medication
    draw_message(1, 4, y, '1. POST /api/medications')
    y -= 0.6
    
    # 2. Insert into DB
    draw_message(4, 7, y, '2. INSERT INTO medications')
    y -= 0.6
    
    # 3. Trigger fires
    ax.text(7, y, '3. TRIGGER fires', ha='center', fontsize=9, style='italic', color='#8e44ad')
    y -= 0.5
    
    # 4. pg_notify
    draw_message(7, 7.5, y, '4. pg_notify()', color='#8e44ad')
    y -= 0.6
    
    # 5. NOTIFY payload
    draw_message(7, 4, y, '5. NOTIFY medications_channel', color='#8e44ad', response=True)
    y -= 0.6
    
    # 6. Parse payload
    ax.text(4, y, '6. Parse JSON payload', ha='center', fontsize=9, style='italic', color='#27ae60')
    y -= 0.5
    
    # 7. Broadcast to WebSocket
    draw_message(4, 10, y, '7. broadcast(user_key, payload)', color='#e74c3c')
    y -= 0.6
    
    # 8. WebSocket message
    draw_message(10, 10.5, y, '8. ws.send_json()', color='#e74c3c')
    y -= 0.6
    
    # 9. Client receives
    ax.text(10, y, '9. Client updates UI', ha='center', fontsize=9, style='italic', color='#27ae60')
    y -= 0.8
    
    # 10. Response to mobile
    draw_message(4, 1, y, '10. 201 Created', color='#27ae60', response=True)
    
    # Legend box
    legend_box = FancyBboxPatch((0.2, 1.2), 3, 1.5, boxstyle="round,pad=0.05",
                               facecolor='#f8f9fa', edgecolor='gray', linewidth=1)
    ax.add_patch(legend_box)
    ax.text(1.7, 2.5, 'Legend:', fontsize=10, fontweight='bold')
    ax.plot([0.4, 1.2], [2.2, 2.2], color='#2980b9', lw=2)
    ax.text(1.4, 2.2, 'HTTP Request', fontsize=9, va='center')
    ax.plot([0.4, 1.2], [1.9, 1.9], color='#8e44ad', lw=2)
    ax.text(1.4, 1.9, 'PostgreSQL NOTIFY', fontsize=9, va='center')
    ax.plot([0.4, 1.2], [1.6, 1.6], color='#e74c3c', lw=2)
    ax.text(1.4, 1.6, 'WebSocket Broadcast', fontsize=9, va='center')
    
    ax.set_xlim(0, 12)
    ax.set_ylim(0.5, 10)
    ax.axis('off')
    ax.set_title('Real-Time Sync: PostgreSQL NOTIFY → WebSocket Broadcast', 
                fontsize=14, fontweight='bold', y=1.02)
    
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, '07_websocket_sequence.png'), dpi=150, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close()
    print("✓ Generated: 07_websocket_sequence.png")

# =============================================================================
# 8. Mobile App Screenshot Mockup (Label Capture)
# =============================================================================
def generate_label_capture_mockup():
    """Generate LabelCaptureScreen mockup with green targeting box"""
    fig, ax = plt.subplots(figsize=(6, 12))
    
    # Phone frame
    phone = FancyBboxPatch((0.05, 0.02), 0.9, 0.96, boxstyle="round,pad=0.02,rounding_size=0.05",
                          facecolor='#1a1a1a', edgecolor='#333', linewidth=3)
    ax.add_patch(phone)
    
    # Screen area
    screen = Rectangle((0.08, 0.05), 0.84, 0.9, facecolor='#2c3e50', edgecolor='none')
    ax.add_patch(screen)
    
    # Camera viewfinder (simulated medication label in background)
    viewfinder = Rectangle((0.1, 0.25), 0.8, 0.5, facecolor='#ecf0f1', edgecolor='none')
    ax.add_patch(viewfinder)
    
    # Simulated text on label
    ax.text(0.5, 0.65, 'METFORMIN 500MG', ha='center', fontsize=11, fontweight='bold')
    ax.text(0.5, 0.58, 'Take 1 tablet twice daily', ha='center', fontsize=9)
    ax.text(0.5, 0.52, 'Patient: John Smith', ha='center', fontsize=9)
    ax.text(0.5, 0.46, 'Qty: 60  Refills: 3', ha='center', fontsize=9)
    ax.text(0.5, 0.35, 'CVS Pharmacy', ha='center', fontsize=8, color='gray')
    
    # GREEN TARGETING BOX (the key feature!)
    target_box = Rectangle((0.15, 0.35), 0.7, 0.35, facecolor='none', 
                           edgecolor='#2ecc71', linewidth=4, linestyle='-')
    ax.add_patch(target_box)
    
    # Corner brackets for targeting box
    bracket_len = 0.08
    bracket_color = '#2ecc71'
    bracket_width = 4
    # Top-left
    ax.plot([0.15, 0.15 + bracket_len], [0.7, 0.7], color=bracket_color, lw=bracket_width)
    ax.plot([0.15, 0.15], [0.7, 0.7 - bracket_len], color=bracket_color, lw=bracket_width)
    # Top-right
    ax.plot([0.85 - bracket_len, 0.85], [0.7, 0.7], color=bracket_color, lw=bracket_width)
    ax.plot([0.85, 0.85], [0.7, 0.7 - bracket_len], color=bracket_color, lw=bracket_width)
    # Bottom-left
    ax.plot([0.15, 0.15 + bracket_len], [0.35, 0.35], color=bracket_color, lw=bracket_width)
    ax.plot([0.15, 0.15], [0.35, 0.35 + bracket_len], color=bracket_color, lw=bracket_width)
    # Bottom-right
    ax.plot([0.85 - bracket_len, 0.85], [0.35, 0.35], color=bracket_color, lw=bracket_width)
    ax.plot([0.85, 0.85], [0.35, 0.35 + bracket_len], color=bracket_color, lw=bracket_width)
    
    # Instruction text at top
    ax.text(0.5, 0.88, 'Scan Medication Label', ha='center', fontsize=12, 
            fontweight='bold', color='white')
    ax.text(0.5, 0.82, 'Align label within green box', ha='center', fontsize=10, color='#bdc3c7')
    
    # Capture button at bottom
    capture_btn = Circle((0.5, 0.12), 0.06, facecolor='white', edgecolor='#2ecc71', linewidth=4)
    ax.add_patch(capture_btn)
    capture_inner = Circle((0.5, 0.12), 0.045, facecolor='#2ecc71', edgecolor='none')
    ax.add_patch(capture_inner)
    
    # Status bar elements
    ax.text(0.15, 0.93, '9:41', ha='left', fontsize=9, color='white', fontweight='bold')
    ax.text(0.85, 0.93, '100%', ha='right', fontsize=9, color='white')
    
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_aspect(2)  # Phone aspect ratio
    ax.axis('off')
    
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, '08_label_capture_screen.png'), dpi=150, bbox_inches='tight',
                facecolor='#1a1a1a', edgecolor='none')
    plt.close()
    print("✓ Generated: 08_label_capture_screen.png")

# =============================================================================
# 9. System Architecture / Data Flow Diagram
# =============================================================================
def generate_system_architecture():
    """Generate complete system architecture diagram"""
    fig, ax = plt.subplots(figsize=(16, 10))
    
    def draw_component(x, y, width, height, name, subtitle='', color='#3498db'):
        box = FancyBboxPatch((x, y), width, height, boxstyle="round,pad=0.02",
                            facecolor=color, edgecolor='black', linewidth=2, alpha=0.9)
        ax.add_patch(box)
        ax.text(x + width/2, y + height/2 + 0.1, name, ha='center', va='center',
                fontsize=11, fontweight='bold', color='white')
        if subtitle:
            ax.text(x + width/2, y + height/2 - 0.2, subtitle, ha='center', va='center',
                    fontsize=9, color='white', alpha=0.9)
    
    def draw_arrow(start, end, label='', color='#2c3e50', curved=False):
        style = 'arc3,rad=0.2' if curved else None
        ax.annotate('', xy=end, xytext=start,
                   arrowprops=dict(arrowstyle='->', color=color, lw=2.5,
                                  connectionstyle=style))
        if label:
            mid = ((start[0] + end[0])/2, (start[1] + end[1])/2)
            ax.text(mid[0], mid[1] + 0.2, label, ha='center', fontsize=8,
                   bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
    
    # Mobile App
    draw_component(0.5, 6, 2.5, 1.5, 'React Native', 'Expo Mobile App', '#9b59b6')
    
    # Web App
    draw_component(0.5, 3.5, 2.5, 1.5, 'TYMI Website', 'Patient Dashboard', '#16a085')
    
    # Flask OCR API
    draw_component(5, 7, 2.5, 1.2, 'Flask API', 'OCR Service', '#e74c3c')
    
    # FastAPI Backend
    draw_component(5, 4, 2.5, 1.5, 'FastAPI', 'Backend API', '#3498db')
    
    # PostgreSQL
    draw_component(10, 4, 2.5, 1.5, 'PostgreSQL', 'Database', '#27ae60')
    
    # Tesseract
    draw_component(9, 7, 2, 1, 'Tesseract', 'OCR Engine', '#f39c12')
    
    # Ollama LLM
    draw_component(9, 8.5, 2, 0.8, 'Ollama', 'LLM Parser', '#8e44ad')
    
    # WebSocket
    draw_component(5, 1.5, 2.5, 1, 'WebSocket', 'Real-time Sync', '#1abc9c')
    
    # Arrows - Mobile to services
    draw_arrow((3, 7), (5, 7.5), 'Base64 Image')
    draw_arrow((3, 6.3), (5, 5), 'REST API')
    draw_arrow((3, 4.5), (5, 4.8), 'REST API')
    
    # Flask to Tesseract/Ollama
    draw_arrow((7.5, 7.6), (9, 7.5), 'Image')
    draw_arrow((7.5, 7.8), (9, 8.7), 'OCR Text', curved=True)
    
    # FastAPI to PostgreSQL
    draw_arrow((7.5, 4.8), (10, 4.8), 'SQL Queries')
    draw_arrow((10, 4.3), (7.5, 4.3), 'Results')
    
    # PostgreSQL to WebSocket (NOTIFY)
    draw_arrow((10.5, 4), (6.5, 2.2), 'pg_notify()', color='#8e44ad', curved=True)
    
    # WebSocket to clients
    draw_arrow((5, 2), (2, 3.5), 'Updates', color='#1abc9c')
    draw_arrow((5, 2.3), (2, 6), 'Updates', color='#1abc9c', curved=True)
    
    # Legend
    legend_items = [
        ('#9b59b6', 'Mobile App'),
        ('#16a085', 'Web App'),
        ('#e74c3c', 'OCR Service'),
        ('#3498db', 'Backend API'),
        ('#27ae60', 'Database'),
        ('#f39c12', 'OCR Engine'),
        ('#8e44ad', 'LLM Service'),
        ('#1abc9c', 'WebSocket'),
    ]
    
    for i, (color, label) in enumerate(legend_items):
        y_pos = 9.5 - i * 0.4
        ax.add_patch(Rectangle((13, y_pos), 0.3, 0.25, facecolor=color))
        ax.text(13.5, y_pos + 0.12, label, fontsize=9, va='center')
    
    ax.set_xlim(-0.5, 15)
    ax.set_ylim(0, 10)
    ax.axis('off')
    ax.set_title('Med OCR System Architecture', fontsize=16, fontweight='bold', y=1.02)
    
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, '09_system_architecture.png'), dpi=150, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close()
    print("✓ Generated: 09_system_architecture.png")

# =============================================================================
# 10. Service Layer Architecture
# =============================================================================
def generate_service_layer():
    """Generate three-tier service layer diagram"""
    fig, ax = plt.subplots(figsize=(12, 8))
    
    # UI Layer
    ui_box = FancyBboxPatch((1, 6), 10, 1.2, boxstyle="round,pad=0.02",
                           facecolor='#3498db', edgecolor='black', linewidth=2)
    ax.add_patch(ui_box)
    ax.text(6, 6.6, 'UI Components', ha='center', va='center', fontsize=14, 
            fontweight='bold', color='white')
    ax.text(6, 6.2, 'LoginScreen | SignUpScreen | DashboardScreen | MedicationReviewScreen', 
            ha='center', fontsize=10, color='white', alpha=0.9)
    
    # Service Layer boxes
    services = [
        (1.5, 'BackendService.ts', 'Remote API Calls\nHTTP/REST', '#e74c3c'),
        (5, 'StorageService.ts', 'Local Persistence\nAsyncStorage', '#27ae60'),
        (8.5, 'SyncService.ts', 'Coordination\nConflict Resolution', '#9b59b6'),
    ]
    
    for x, name, desc, color in services:
        box = FancyBboxPatch((x, 3.5), 2.5, 1.8, boxstyle="round,pad=0.02",
                            facecolor=color, edgecolor='black', linewidth=2)
        ax.add_patch(box)
        ax.text(x + 1.25, 4.8, name, ha='center', va='center', fontsize=11, 
                fontweight='bold', color='white')
        ax.text(x + 1.25, 4.1, desc, ha='center', va='center', fontsize=9, color='white')
    
    # Infrastructure Layer
    infra_box = FancyBboxPatch((1, 1), 10, 1.2, boxstyle="round,pad=0.02",
                              facecolor='#34495e', edgecolor='black', linewidth=2)
    ax.add_patch(infra_box)
    ax.text(6, 1.6, 'Infrastructure', ha='center', va='center', fontsize=14, 
            fontweight='bold', color='white')
    ax.text(6, 1.2, 'AsyncStorage | Fetch API | WebSocket', ha='center', fontsize=10, 
            color='white', alpha=0.9)
    
    # Arrows from UI to Services
    for x in [2.75, 6.25, 9.75]:
        ax.annotate('', xy=(x, 5.3), xytext=(x, 6),
                   arrowprops=dict(arrowstyle='->', color='black', lw=2))
    
    # Arrows from Services to Infrastructure
    for x in [2.75, 6.25, 9.75]:
        ax.annotate('', xy=(x, 2.2), xytext=(x, 3.5),
                   arrowprops=dict(arrowstyle='->', color='black', lw=2))
    
    # Horizontal arrows between services
    ax.annotate('', xy=(5, 4.4), xytext=(4, 4.4),
               arrowprops=dict(arrowstyle='<->', color='gray', lw=1.5, linestyle='--'))
    ax.annotate('', xy=(8.5, 4.4), xytext=(7.5, 4.4),
               arrowprops=dict(arrowstyle='<->', color='gray', lw=1.5, linestyle='--'))
    
    # Layer labels
    ax.text(0.3, 6.6, 'View\nLayer', ha='center', va='center', fontsize=10, fontweight='bold')
    ax.text(0.3, 4.4, 'Service\nLayer', ha='center', va='center', fontsize=10, fontweight='bold')
    ax.text(0.3, 1.6, 'Infra\nLayer', ha='center', va='center', fontsize=10, fontweight='bold')
    
    ax.set_xlim(-0.5, 12)
    ax.set_ylim(0, 8)
    ax.axis('off')
    ax.set_title('Three-Tier Service Architecture', fontsize=14, fontweight='bold', y=1.02)
    
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, '10_service_layer.png'), dpi=150, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close()
    print("✓ Generated: 10_service_layer.png")

# =============================================================================
# Main execution
# =============================================================================
if __name__ == '__main__':
    print("=" * 50)
    print("Generating Lab Notebook Images...")
    print("=" * 50)
    print(f"Output directory: {OUTPUT_DIR}")
    print()
    
    set_style()
    
    # Generate all images
    generate_preprocessing_comparison()
    generate_otsu_histogram()
    generate_crop_region_diagram()
    generate_ocr_flowchart()
    generate_perspective_correction()
    generate_er_diagram()
    generate_websocket_sequence()
    generate_label_capture_mockup()
    generate_system_architecture()
    generate_service_layer()
    
    print()
    print("=" * 50)
    print("All images generated successfully!")
    print("=" * 50)
