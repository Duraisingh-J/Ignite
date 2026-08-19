import re

with open('backend/app/schemas.py', 'r', encoding='utf-8') as f:
    schemas = f.read()

# Classes to remove tenant_id from
targets = ['RegionCreate', 'RoleCreate', 'LeaveTypeCreate', 'EmployeeCreate', 'HolidayCreate']

for target in targets:
    # Match the class declaration and then find the first tenant_id: UUID
    # and remove it.
    pattern = rf"(class {target}\(CamelIn\):\n(?:    [^\n]+\n)*)    tenant_id: UUID\n"
    schemas = re.sub(pattern, r"\1", schemas)


signup_models = """

class SignupRequest(CamelIn):
    org_name: str
    admin_name: str
    email: EmailStr
    password: str
    region_name: str

class SignupResponse(CamelModel):
    tenant_id: UUID
    employee_id: UUID
    access_token: str
"""

schemas += signup_models

with open('backend/app/schemas.py', 'w', encoding='utf-8') as f:
    f.write(schemas)
