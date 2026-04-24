import os

from ..shared.database import SessionLocal
from ..shared.security import hash_password
from ..workforce.domain.employee import Employee


def bootstrap_admin_if_missing():
    db = SessionLocal()
    try:
        admin_exists = (
            db.query(Employee)
            .filter(
                Employee.is_admin.is_(True),
                Employee.password_hash.isnot(None),
            )
            .first()
        )
        if admin_exists:
            return

        admin_email = os.getenv("INVENTORY_ADMIN_EMAIL", "admin@autaza.local")
        admin_password = os.getenv("INVENTORY_ADMIN_PASSWORD", "admin123")
        pwd_hash = hash_password(admin_password)

        employee = db.query(Employee).filter(Employee.email == admin_email).first()
        if employee:
            employee.password_hash = pwd_hash
            employee.is_admin = True
        else:
            employee = Employee(
                name="Admin",
                department="Admin",
                email=admin_email,
                password_hash=pwd_hash,
                is_admin=True,
            )
            db.add(employee)

        db.commit()
        print(f"Admin bootstrap: {admin_email}")
    finally:
        db.close()
