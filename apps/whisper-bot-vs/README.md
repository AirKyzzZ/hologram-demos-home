# whisper-bot-vs

**Status: placeholder.** This directory is reserved for a speech-to-text hologram agent.

## Planned behavior

A VS agent that:
1. Accepts audio attachments via DIDComm (`MediaMessage` with mime type `audio/*`).
2. Transcribes them via OpenAI Whisper (API) or `whisper.cpp` (local, self-hosted).
3. Replies with the transcript + optional LLM-generated summary.
4. Optionally stores the transcript under a verifiable credential for later retrieval.

## When you're ready to build it

```bash
cp -r ../_template-vs/* .         # copy the template
# edit package.json name → whisper-bot-vs
# edit src/core/echo.logic.ts → whisper.logic.ts (handle MediaMessage, call Whisper)
# add agent pack at ../../agent-packs/whisper-bot/
# add Helm values at ../../deploy/charts/whisper-bot-values.yaml
```

See [`../../docs/ADDING_A_BOT.md`](../../docs/ADDING_A_BOT.md).

## Extra infrastructure needed

- **OpenAI API key** (for Whisper API), or
- **`whisper.cpp` or `faster-whisper` container** running alongside in the same namespace
- **Object storage** (MinIO or similar) for temporary audio upload
- **Extra memory** — Whisper models are RAM-hungry

None of these are provisioned yet. Add them to `deploy/charts/whisper-bot-values.yaml` when you start the implementation.
