import os

problem_files = [
    "frontend/src/auth.ts",
    "frontend/src/app/layout.tsx",
    "frontend/src/app/page.tsx",
    "frontend/src/app/dashboard/page.tsx",
    "frontend/src/app/(admin)/layout.tsx",
    "frontend/src/components/ui/card.tsx",
    "frontend/src/components/ui/button.tsx",
    "frontend/src/components/auth/login-form.tsx",
    "frontend/src/components/providers/AccessibilityProvider.tsx",
    "frontend/src/components/business/SmartDropzone.tsx",
    "frontend/src/lib/utils.ts"
]

def fix_file(filepath):
    abs_path = os.path.abspath(filepath)
    if not os.path.exists(abs_path):
        print(f"File not found: {abs_path}")
        return

    with open(abs_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    if not lines:
        return

    # Check if first line is triple quote
    if lines[0].strip() == '"""':
        print(f"Fixing {filepath}...")
        lines[0] = "/**\n"
        
        # Find the closing triple quote
        found_closing = False
        for i in range(1, len(lines)):
            if lines[i].strip() == '"""':
                lines[i] = " */\n"
                found_closing = True
                break
            # Add * prefix to inner lines if they don't have it (optional but good for JSDoc)
            # For now, let's just make it valid syntax by changing delimiters.
            # Adding * to every line might be too invasive for now unless requested.
            # However, looking at the plan example:
            # 112: /**
            # 113:  * [IDENTITY]: ...
            # it implies we should probably add ` * ` prefix?
            # The plan example showed:
            # 27: ```typescript
            # 28: /**
            # 29:  * [IDENTITY]: Application Authentication Config
            #
            # The original content was:
            # 1: """
            # 2: [IDENTITY]: Application Authentication Config
            #
            # So just changing brackets is strictly enough for syntax, but for style ` * ` is better.
            # Let's stick to minimal valid fix first: change delimiters.
            # Wait, TS might complain if it looks like JSDoc but contents aren't aligned? No, it's just a comment.
            # But `/**` starts a JSDoc comment.
            
        if found_closing:
            with open(abs_path, "w", encoding="utf-8") as f:
                f.writelines(lines)
            print(f"Fixed {filepath}")
        else:
            print(f"Warning: No closing triple quote found in {filepath}")
    else:
        print(f"Skipping {filepath}: Does not start with triple quote.")

if __name__ == "__main__":
    for p in problem_files:
        fix_file(p)
