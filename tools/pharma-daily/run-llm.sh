#!/usr/bin/env bash
# run-llm.sh <kimi|deepseek> <prompt> — headless LLM call via Kimi Code CLI
# with cross-vendor fallback. The first argument picks the PREFERRED vendor;
# on failure the other vendor carries the run. Used by the pharma-daily
# workflow: writer steps prefer kimi, the critique step prefers deepseek so
# the adversarial reviewer is never the writer's own model.
#
# Required env: KIMI_API (Kimi Platform key), DEEPSEEK_KEY.
set -u

PREFERRED="${1:?usage: run-llm.sh <kimi|deepseek> <prompt>}"
PROMPT="${2:?usage: run-llm.sh <kimi|deepseek> <prompt>}"

export KIMI_CODE_NO_AUTO_UPDATE=1
export KIMI_DISABLE_TELEMETRY=1

run_kimi() {
  KIMI_MODEL_NAME=kimi-k2.7-code KIMI_MODEL_PROVIDER_TYPE=kimi \
  KIMI_MODEL_API_KEY="$KIMI_API" KIMI_MODEL_BASE_URL=https://api.moonshot.ai/v1 \
    kimi -p "$PROMPT"
}

run_deepseek() {
  KIMI_MODEL_NAME=deepseek-v4-pro KIMI_MODEL_PROVIDER_TYPE=openai \
  KIMI_MODEL_API_KEY="$DEEPSEEK_KEY" KIMI_MODEL_BASE_URL=https://api.deepseek.com \
    kimi -p "$PROMPT"
}

if [ "$PREFERRED" = "deepseek" ]; then
  run_deepseek || { echo "::warning::DeepSeek failed — falling back to Kimi"; run_kimi; }
else
  run_kimi || { echo "::warning::Kimi failed (suspended balance?) — falling back to DeepSeek"; run_deepseek; }
fi
