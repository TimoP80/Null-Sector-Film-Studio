import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from worker import build_workflow, validate_mp4


class WorkerTests(unittest.TestCase):
    def request(self, kind="t2v"):
        value = {"type": kind, "prompt": "test", "resolution": "864x480", "frames": 25, "fps": 24, "steps": 25, "cfg": 3, "seed": 42}
        if kind == "i2v": value["sourceImage"] = "data:image/png;base64,iVBORw0KGgo="
        return value

    def test_t2v_graph_matches_verified_nodes(self):
        graph = build_workflow(self.request())
        self.assertEqual(graph["6"]["class_type"], "EmptyLTXVLatentVideo")
        self.assertEqual(graph["12"]["class_type"], "SaveVideo")
        self.assertEqual(graph["12"]["inputs"]["codec"], "h264")
        self.assertEqual(graph["10"]["inputs"]["noise_seed"], 42)

    def test_i2v_graph_uses_load_image_and_ltx_i2v(self):
        graph = build_workflow(self.request("i2v"), "job.png")
        self.assertEqual(graph["7"]["class_type"], "LoadImage")
        self.assertEqual(graph["6"]["class_type"], "LTXVImgToVideo")
        self.assertEqual(graph["6"]["inputs"]["image"], ["7", 0])
        self.assertEqual(graph["10"]["inputs"]["latent_image"], ["6", 2])

    def test_invalid_mp4_is_rejected_before_completion(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "bad.mp4"
            path.write_bytes(b"not an mp4")
            with self.assertRaises(RuntimeError): validate_mp4(path)


if __name__ == "__main__": unittest.main()
