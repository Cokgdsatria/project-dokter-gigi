import os
from unittest import TestCase
from unittest.mock import patch

from scripts.migrate_storage_doctor_folders import (
    build_destination_path,
    validate_supabase_target,
)


class StorageFolderMigrationTests(TestCase):
    def test_builds_destination_for_legacy_doctor_id_folder(self):
        self.assertEqual(
            build_destination_path(
                source_path=(
                    "rontgen/cmsy2feup001ne645gdbfbltj/"
                    "1a2b3c4d-rontgen-001.jpg"
                ),
                doctor_email="dokter.staging3@gmail.com",
                doctor_id="cmsy2feup001ne645gdbfbltj",
            ),
            (
                "rontgen/dokter-staging3-at-gmail-com--"
                "cmsy2feup001ne645gdbfbltj/1a2b3c4d-rontgen-001.jpg"
            ),
        )

    def test_returns_none_when_folder_is_already_current(self):
        path = (
            "rontgen/dokter-staging3-at-gmail-com--"
            "cmsy2feup001ne645gdbfbltj/1a2b3c4d-rontgen-001.jpg"
        )
        self.assertIsNone(
            build_destination_path(
                source_path=path,
                doctor_email="dokter.staging3@gmail.com",
                doctor_id="cmsy2feup001ne645gdbfbltj",
            )
        )

    def test_rejects_folder_owned_by_another_doctor(self):
        with self.assertRaises(ValueError):
            build_destination_path(
                source_path="rontgen/another-doctor/image.jpg",
                doctor_email="dokter.staging3@gmail.com",
                doctor_id="cmsy2feup001ne645gdbfbltj",
            )

    @patch.dict(
        os.environ,
        {
            "SUPABASE_URL": "https://stagingref.supabase.co",
            "DATABASE_URL": "postgresql://postgres.stagingref:secret@pooler/db",
            "DIRECT_URL": "postgresql://postgres.stagingref:secret@pooler/db",
        },
        clear=False,
    )
    def test_validates_matching_supabase_targets(self):
        self.assertEqual(
            validate_supabase_target("stagingref"),
            "stagingref",
        )

    @patch.dict(
        os.environ,
        {
            "SUPABASE_URL": "https://stagingref.supabase.co",
            "DATABASE_URL": "postgresql://postgres.productionref:secret@pooler/db",
            "DIRECT_URL": "postgresql://postgres.stagingref:secret@pooler/db",
        },
        clear=False,
    )
    def test_rejects_mixed_database_and_storage_projects(self):
        with self.assertRaises(RuntimeError):
            validate_supabase_target("stagingref")
