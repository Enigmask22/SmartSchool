# Backend File Structure

```
backend/
├── main.py
├── app_factory.py
├── __init__.py
├── pytest.ini
├── README.md
├── requirements.txt
├── Dockerfile
│
├── admin/
│   ├── __init__.py
│   ├── api.py
│   ├── models.py
│   ├── services.py
│   └── validators.py
│
├── ai_services/
│   ├── __init__.py
│   ├── api.py
│   ├── models.py
│   └── services.py
│
├── attendance/
│   ├── __init__.py
│   ├── api.py
│   ├── models.py
│   └── services.py
│
├── auth/
│   ├── __init__.py
│   ├── api.py
│   ├── models.py
│   └── services.py
│
├── camera_manager/
│   ├── __init__.py
│   ├── api.py
│   ├── db_service.py
│   ├── integration_example.py
│   ├── models.py
│   ├── services.py
│   └── HUONG_DAN_QUICK_START.md
│
├── core/
│   ├── __init__.py
│   ├── config.py
│   ├── database.py
│   ├── dependencies.py
│   ├── edit_permissions.py
│   ├── encode_school_config.py
│   ├── error_codes.py
│   ├── errors.py
│   ├── logger.py
│   ├── school_database_manager.py
│   ├── school_databases.encoded
│   ├── school_databases.json.example
│   └── system_settings.py
│
├── feedback/
│   ├── __init__.py
│   ├── api.py
│   ├── email_report_card_service.py
│   ├── gemini_service.py
│   ├── models.py
│   ├── openrouter_service.py
│   └── services.py
│
├── grades/
│   ├── __init__.py
│   └── ocr_services/
│       ├── gemini_ocr.py
│       └── qwen_ocr.py
│
├── homeroom/
│   ├── __init__.py
│   ├── api.py
│   ├── models.py
│   ├── services.py
│   └── subject_import.py
│
├── school_config/
│   └── __init__.py
│
├── score_settings/
│   ├── __init__.py
│   ├── api.py
│   └── models.py
│
├── scores/
│   ├── __init__.py
│   ├── api.py
│   ├── models.py
│   ├── services.py
│   └── ocr_services/
│       ├── gemini_ocr.py
│       └── qwen_ocr.py
│
├── students/
│   ├── __init__.py
│   ├── api.py
│   ├── models.py
│   └── services.py
│
├── users/
│   ├── __init__.py
│   ├── api.py
│   ├── models.py
│   └── services.py
│
└── tests/
    ├── __init__.py
    ├── conftest.py
    ├── test_admin_validation.py
    ├── test_example.py
    ├── TS-ADM01-01-07.py
    ├── TS-ADM02-01-11.py
    ├── TS-ADM02EX-01-09.py
    ├── TS-ADM03-01-07.py
    ├── TS-ADM04-01-07.py
    ├── TS-ADM06-01-08.py
    ├── TS-ADM06EX-T01-T07.py
    ├── TS-ADM07-01-08.py
    ├── TS-ADM08-01-09.py
    ├── TS-ADM09-01-09.py
    ├── TS-ADM10-01-09.py
    ├── TS-GEN01-01-07.py
    ├── TS-GEN03-01-05.py
    ├── TS-GEN04-01-05.py
    ├── TS-HOM01-01-04-06-07-08.py
    ├── TS-HOM02-01-04-06.py
    ├── TS-HOM03-01-03-04-06-07-08.py
    ├── TS-HOM04-01-02-03-04-05-06-07-08.py
    ├── TS-SUB01-01-08.py
    ├── TS-SUB02-01-08.py
    ├── TS-SUB02EXT-01-09.py
    ├── TS-SUB02EXT-2-ocr-backend.py
    ├── fixtures/
    │   └── __init__.py
    ├── mocks/
    │   ├── __init__.py
    │   └── external_services.py
    ├── test_attendance/
    │   └── __init__.py
    ├── test_auth/
    │   └── __init__.py
    ├── test_feedback/
    │   └── __init__.py
    ├── test_scores/
    │   └── __init__.py
    └── unit/
        ├── test_auth_services.py
        ├── test_core_config.py
        ├── test_core_database.py
        ├── test_core_logger.py
        └── test_users_services.py
```
