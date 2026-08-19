import re

with open('backend/app/schemas.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add password_hash and role to EmployeeOut
# Find class EmployeeOut(CamelModel): and its fields.
# We'll just append it to the end of EmployeeOut fields.
pattern = r'(class EmployeeOut\(CamelModel\):\n(?:    [^\n]+\n)+)'
def add_fields(match):
    return match.group(1) + '    password_hash: str | None = None\n    role: str | None = None\n'
code = re.sub(pattern, add_fields, code, count=1)

# 2. Remove tenant_id from Create models
targets = ['RegionCreate', 'RoleCreate', 'LeaveTypeCreate', 'EmployeeCreate', 'HolidayCreate']
for target in targets:
    pattern_tenant = rf"(class {target}\(CamelIn\):\n(?:    [^\n]+\n)*?)    tenant_id: UUID\n"
    code = re.sub(pattern_tenant, r"\1", code)

# 3. Add Login/Signup models at the end
auth_models = """

class LoginRequest(CamelIn):
    email: EmailStr
    password: str

class LoginResponse(CamelModel):
    access_token: str
    role: str

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

code += auth_models

with open('backend/app/schemas.py', 'w', encoding='utf-8') as f:
    f.write(code)
