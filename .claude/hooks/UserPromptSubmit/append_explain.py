# append_flag_e.py
# If CLAUDE_FLAG_E=1, ask Claude to clearly explain the purpose of the file or project.
import json
import os, sys

def main() -> None:
    try:
        input_data = json.load(sys.stdin)
        prompt = sys.stdin.read()
        if prompt.rstrip().endswith("-e"):
            print (
            "[SYSTEM NOTE]\n"
            "Your task: clearly explain what this file or project does.\n"
            "- Start with a plain-language overview.\n"
            "- Then give a step-by-step breakdown of the purpose of each major part.\n"
            "- Avoid code repetition; focus on the big picture.\n\n"
            )
    except Exception as e:
        print(f"append_explain hook error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
