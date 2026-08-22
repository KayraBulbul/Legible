import asyncio
import json
import os
import sys
from contextlib import suppress
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Protocol

from api.schemas import AccessibilitySettings, SemanticDocument


@dataclass(frozen=True)
class PdfRenderInput:
    title: str
    original_url: str
    captured_at: datetime
    document: SemanticDocument
    settings: AccessibilitySettings


class PdfRendererError(Exception):
    """The renderer could not produce a PDF."""


class PdfRendererTimeout(PdfRendererError):
    """The renderer exceeded its time limit."""


class PdfRenderer(Protocol):
    async def render(self, render_input: PdfRenderInput) -> bytes: ...


class WeasyPrintRenderer:
    def __init__(self, timeout_seconds: float) -> None:
        self._timeout_seconds = timeout_seconds
        self._worker_path = Path(__file__).with_name("worker.py")

    async def render(self, render_input: PdfRenderInput) -> bytes:
        payload = _serialize_render_input(render_input)
        environment = {
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
            "PATH": os.defpath,
            "PYTHONHASHSEED": "0",
        }
        try:
            process = await asyncio.create_subprocess_exec(
                sys.executable,
                "-I",
                str(self._worker_path),
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=environment,
            )
        except OSError as exc:
            raise PdfRendererError("PDF worker could not start") from exc
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(payload), timeout=self._timeout_seconds
            )
        except TimeoutError as exc:
            if process.returncode is None:
                with suppress(ProcessLookupError):
                    process.kill()
            await process.wait()
            raise PdfRendererTimeout("PDF rendering timed out") from exc
        except OSError as exc:
            if process.returncode is None:
                with suppress(ProcessLookupError):
                    process.kill()
            await process.wait()
            raise PdfRendererError("PDF worker communication failed") from exc

        if process.returncode != 0 or not stdout.startswith(b"%PDF"):
            detail = stderr.decode("utf-8", errors="replace")[-2000:]
            raise PdfRendererError(f"PDF worker failed: {detail}")
        return stdout


def _serialize_render_input(render_input: PdfRenderInput) -> bytes:
    payload = {
        "title": render_input.title,
        "original_url": render_input.original_url,
        "captured_at": render_input.captured_at.isoformat(),
        "document": render_input.document.model_dump(mode="json", by_alias=True),
        "settings": render_input.settings.model_dump(mode="json", by_alias=True),
    }
    return json.dumps(payload, separators=(",", ":")).encode("utf-8")
