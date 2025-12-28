import sys
import json
import io
import base64
import numpy as np
from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def render_heatmap(sensors, status):
    # Create a grid covering the room area
    xs = [s['x'] for s in sensors]
    zs = [s['z'] for s in sensors]
    temps = [s['temperature'] for s in sensors]

    if len(sensors) == 0:
        return None

    # Grid resolution
    grid_size = (100, 80)
    xi = np.linspace(min(xs)-1, max(xs)+1, grid_size[0])
    zi = np.linspace(min(zs)-1, max(zs)+1, grid_size[1])
    X, Z = np.meshgrid(xi, zi)

    # Inverse distance weighting interpolation
    grid = np.zeros_like(X)
    for i in range(X.shape[0]):
        for j in range(X.shape[1]):
            px = X[i,j]
            pz = Z[i,j]
            dists = np.sqrt((np.array(xs)-px)**2 + (np.array(zs)-pz)**2) + 1e-6
            weights = 1.0 / dists
            grid[i,j] = np.sum(weights * np.array(temps)) / np.sum(weights)

    # Plot heatmap
    fig, ax = plt.subplots(figsize=(6,5))
    c = ax.imshow(grid, origin='lower', cmap='inferno', extent=(xi[0], xi[-1], zi[0], zi[-1]))
    ax.set_title('Thermal Map')
    ax.set_xlabel('X')
    ax.set_ylabel('Z')
    # overlay sensor points
    ax.scatter(xs, zs, c='cyan', s=20, edgecolors='black')

    plt.colorbar(c, ax=ax, label='°C')
    plt.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=100)
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('ascii')

if __name__ == '__main__':
    data = json.load(sys.stdin)
    sensors = data.get('sensors', [])
    status = data.get('status', {})
    img_b64 = render_heatmap(sensors, status)
    if img_b64 is None:
        print('')
    else:
        print(img_b64)
