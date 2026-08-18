const fs = require('fs');

function applyInPlace() {
  const configs = [
    {
      file: 'admin/Roles.jsx',
      target: '{roles.map((role) => {',
      replace: '{loading ? (<><ShimmerBlock height={140} borderRadius={12} /><ShimmerBlock height={140} borderRadius={12} /></>) : roles.map((role) => {'
    },
    {
      file: 'admin/Regions.jsx',
      target: '{regions.map((region) => (',
      replace: '{loading ? (<><ShimmerBlock height={80} borderRadius={12} /><ShimmerBlock height={80} borderRadius={12} /></>) : regions.map((region) => ('
    },
    {
      file: 'admin/Policies.jsx',
      target: '{policies.map((pol) => {',
      replace: '{loading ? (<><ShimmerBlock height={140} borderRadius={12} /><ShimmerBlock height={140} borderRadius={12} /></>) : policies.map((pol) => {'
    },
    {
      file: 'admin/Holidays.jsx',
      target: '{holidays.map((h) => (',
      replace: '{loading ? (<><ShimmerBlock height={60} borderRadius={12} /><ShimmerBlock height={60} borderRadius={12} /></>) : holidays.map((h) => ('
    },
    {
      file: 'admin/LeaveTypes.jsx',
      target: '{leaveTypes.map((type) => {',
      replace: '{loading ? (<><ShimmerBlock height={120} borderRadius={12} /><ShimmerBlock height={120} borderRadius={12} /></>) : leaveTypes.map((type) => {'
    },
    {
      file: 'admin/Employees.jsx',
      target: '{employees.map((emp) => (',
      replace: '{loading ? (<><ShimmerBlock height={50} /><ShimmerBlock height={50} /></>) : employees.map((emp) => ('
    },
    {
      file: 'manager/Approvals.jsx',
      target: '{approvals.map((req) => (',
      replace: '{loading ? (<><ShimmerBlock height={100} borderRadius={12} /><ShimmerBlock height={100} borderRadius={12} /></>) : approvals.map((req) => ('
    },
    {
      file: 'employee/MyRequests.jsx',
      target: '{requests.map((req) => (',
      replace: '{loading ? (<><ShimmerBlock height={60} /><ShimmerBlock height={60} /></>) : requests.map((req) => ('
    },
    {
      file: 'admin/Dashboard.jsx',
      target: '{tiles.map(([label, val, color]) => (',
      replace: '{!stats ? (<><ShimmerBlock height={100} borderRadius={12}/><ShimmerBlock height={100} borderRadius={12}/><ShimmerBlock height={100} borderRadius={12}/><ShimmerBlock height={100} borderRadius={12}/><ShimmerBlock height={100} borderRadius={12}/><ShimmerBlock height={100} borderRadius={12}/></>) : tiles.map(([label, val, color]) => ('
    }
  ];

  for (const c of configs) {
    const path = 'd:/IGNITE/leave-app/src/pages/' + c.file;
    if (!fs.existsSync(path)) continue;
    let content = fs.readFileSync(path, 'utf8');
    if (!content.includes('ShimmerBlock height')) {
      content = content.replace(c.target, c.replace);
      fs.writeFileSync(path, content);
      console.log('Applied in-place to ' + c.file);
    }
  }
}

applyInPlace();
