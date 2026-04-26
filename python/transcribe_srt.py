import argparse
import os
import sys
from datetime import timedelta


def format_timestamp(seconds: float) -> str:
    if seconds < 0:
        seconds = 0
    total_milliseconds = int(round(seconds * 1000))
    td = timedelta(milliseconds=total_milliseconds)
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    millis = total_milliseconds % 1000
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def write_srt(segments, output_file: str) -> None:
    with open(output_file, "w", encoding="utf-8") as f:
        for i, segment in enumerate(segments, start=1):
            start = format_timestamp(segment.start)
            end = format_timestamp(segment.end)
            text = segment.text.strip()

            f.write(f"{i}\n")
            f.write(f"{start} --> {end}\n")
            f.write(f"{text}\n\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Transcribe MP3 to SRT using faster-whisper")
    parser.add_argument("--input", required=True, help="Path to input MP3 file")
    parser.add_argument("--output_dir", required=True, help="Directory to write SRT file")
    parser.add_argument("--model", default="large-v3", help="Whisper model")
    parser.add_argument("--device", default="cuda", choices=["cuda", "cpu"], help="Device type")
    parser.add_argument(
        "--compute_type",
        default="float16",
        choices=["float16", "int8_float16", "int8"],
        help="Compute type",
    )

    args = parser.parse_args()

    input_path = os.path.abspath(args.input)
    output_dir = os.path.abspath(args.output_dir)

    if not os.path.isfile(input_path):
        print(f"Input file not found: {input_path}", file=sys.stderr)
        return 1

    os.makedirs(output_dir, exist_ok=True)

    base_name = os.path.splitext(os.path.basename(input_path))[0]
    output_file = os.path.join(output_dir, f"{base_name}.srt")

    try:
        print("Loading faster-whisper model...")
        print(f"Model={args.model}, Device={args.device}, ComputeType={args.compute_type}")

        from faster_whisper import WhisperModel

        model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)

        print("Starting transcription...")
        segments, info = model.transcribe(input_path, beam_size=5, vad_filter=True)

        print(f"Detected language: {info.language} (probability={info.language_probability:.2f})")

        segment_list = list(segments)
        print(f"Transcription complete. Segments: {len(segment_list)}")

        print(f"Writing SRT to: {output_file}")
        write_srt(segment_list, output_file)

        print("Done.")
        print(f"OUTPUT_FILE={output_file}")
        return 0

    except Exception as exc:
        print("Transcription failed.", file=sys.stderr)
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
