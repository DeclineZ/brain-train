import re

def transform(match):
    x = int(match.group(1))
    y = int(match.group(2))
    
    # Scale width (Narrower) - Center at 400
    # Compress spread by 35% (0.65 multiplier) to fit narrow screens tightly
    new_x = 400 + (x - 400) * 0.65
    
    # Scale height (Longer) - Expand by 15% and add padding
    new_y = y * 1.15 + 80 
    
    return f"x: {int(new_x)}, y: {int(new_y)}"

def transform_p(match):
    x = int(match.group(1))
    y = int(match.group(2))
    
    new_x = 400 + (x - 400) * 0.65
    new_y = y * 1.15 + 80
    
    return f"p({int(new_x)}, {int(new_y)})"    

file_path = 'games/game-05-wormtrain/levels.ts'
with open(file_path, 'r') as f:
    content = f.read()

# Replace x: ..., y: ...
# Note: Identify patterns carefully
content = re.sub(r"x:\s*(\d+),\s*y:\s*(\d+)", transform, content)

# Replace p(..., ...)
content = re.sub(r"p\((\d+),\s*(\d+)\)", transform_p, content)

with open(file_path, 'w') as f:
    f.write(content)

print("Levels optimized for mobile layout.")
