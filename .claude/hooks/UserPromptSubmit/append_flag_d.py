# append_flag_d.py
# If CLAUDE_FLAG_D=1, inject a system note: think hard, answer short.
import json
import os, sys

def main() -> None:
    try:
        input_data = json.load(sys.stdin)
        prompt = input_data.get("prompt", "")

        if prompt.rstrip().endswith("-d"):
            print (
            "[SYSTEM NOTE]\n"
            "Think deeply off-screen. Return only the final answer, "
            "concise (1–3 sentences) or 3 bullets max. No fluff.\n\n"
        )
    except Exception as e:
        print(f"append_flag_d hook error: {e}", file=sys.stderr)
        sys.exit(1)
if __name__ == "__main__":
    main()
