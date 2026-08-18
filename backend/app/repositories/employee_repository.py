from uuid import UUID

from app.db import fetch_one

_SELECT = """
    SELECT e.id, e.tenant_id, e.manager_id, e.region_id,
           e.name, e.email, e.join_date,
           r.code AS region_code, r.country_name AS region_country,
           m.name AS manager_name
      FROM employee e
      JOIN region r ON r.id = e.region_id
      LEFT JOIN employee m ON m.id = e.manager_id
     WHERE e.id = %s
"""


async def find_by_id(employee_id: UUID) -> dict | None:
    return await fetch_one(_SELECT, (employee_id,))
