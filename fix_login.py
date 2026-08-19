import re

with open('leave-app/src/pages/auth/Login.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('import { useNavigate } from "react-router-dom";', 'import { useNavigate, Link } from "react-router-dom";\nimport { useSession } from "../../context/SessionContext";')
code = code.replace('const [organization, setOrganization] = useState("");\n', '')
code = code.replace('const navigate = useNavigate();', 'const navigate = useNavigate();\n  const { login } = useSession();')
code = code.replace('JSON.stringify({ email, password, organization })', 'JSON.stringify({ email, password })')
code = code.replace('localStorage.setItem("token", data.access_token);', 'login(data.access_token);')

# Remove the organization input div
pattern = r'<div>\s*<label[^>]*>\s*Organization Name\s*</label>\s*<input[^>]*value=\{organization\}[^>]*>\s*</div>'
code = re.sub(pattern, '', code, flags=re.DOTALL)

with open('leave-app/src/pages/auth/Login.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
