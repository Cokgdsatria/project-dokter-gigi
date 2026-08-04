from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from app.api.v1.history import get_history, get_history_detail
from app.api.v1.homebases import get_homebases
from app.api.v1.patients import get_patients


class DoctorIsolationTests(IsolatedAsyncioTestCase):
    async def test_patient_list_is_scoped_to_current_doctor(self):
        doctor = SimpleNamespace(id="doctor-a")
        count = AsyncMock(return_value=0)
        find_many = AsyncMock(return_value=[])
        fake_db = SimpleNamespace(
            patient=SimpleNamespace(count=count, find_many=find_many)
        )
        with patch("app.api.v1.patients.db", fake_db):
            await get_patients(skip=0, take=20, q=None, current_user=doctor)

        self.assertEqual(count.await_args.kwargs["where"], {"doctorId": "doctor-a"})
        self.assertEqual(find_many.await_args.kwargs["where"], {"doctorId": "doctor-a"})

    async def test_homebase_list_is_scoped_to_current_doctor(self):
        doctor = SimpleNamespace(id="doctor-b")
        count = AsyncMock(return_value=0)
        find_many = AsyncMock(return_value=[])
        fake_db = SimpleNamespace(
            homebase=SimpleNamespace(count=count, find_many=find_many)
        )
        with patch("app.api.v1.homebases.db", fake_db):
            await get_homebases(skip=0, take=20, q=None, current_user=doctor)

        self.assertEqual(count.await_args.kwargs["where"], {"doctorId": "doctor-b"})
        self.assertEqual(find_many.await_args.kwargs["where"], {"doctorId": "doctor-b"})

    async def test_history_list_is_scoped_to_current_doctor(self):
        doctor = SimpleNamespace(id="doctor-c")
        count = AsyncMock(return_value=0)
        find_many = AsyncMock(return_value=[])
        fake_db = SimpleNamespace(
            scanhistory=SimpleNamespace(count=count, find_many=find_many)
        )
        with patch("app.api.v1.history.db", fake_db):
            await get_history(
                skip=0,
                take=20,
                status=None,
                patientId=None,
                current_user=doctor,
            )

        self.assertEqual(count.await_args.kwargs["where"], {"doctorId": "doctor-c"})
        self.assertEqual(find_many.await_args.kwargs["where"], {"doctorId": "doctor-c"})

    async def test_history_detail_uses_scan_and_doctor_ids(self):
        doctor = SimpleNamespace(id="doctor-d")
        find_first = AsyncMock(return_value=None)
        fake_db = SimpleNamespace(
            scanhistory=SimpleNamespace(find_first=find_first)
        )
        with patch("app.api.v1.history.db", fake_db):
            with self.assertRaises(HTTPException) as context:
                await get_history_detail("scan-from-other-doctor", current_user=doctor)

        self.assertEqual(context.exception.status_code, 404)
        self.assertEqual(
            find_first.await_args.kwargs["where"],
            {"id": "scan-from-other-doctor", "doctorId": "doctor-d"},
        )
