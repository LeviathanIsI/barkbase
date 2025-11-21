import re

# Read the CDK stack file
with open('D:/barkbase-react/aws/cdk/lib/cdk-stack.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all httpApi.addRoutes calls
route_pattern = r'(httpApi\.addRoutes\({[^}]+integration:\s*\w+)([\s,]*)(})'

def should_have_authorizer(route_text):
    """Check if this route should have an authorizer"""
    # Skip OPTIONS routes (CORS preflight)
    if 'HttpMethod.OPTIONS' in route_text or 'OPTIONS' in route_text:
        return False

    # Skip auth routes (public endpoints)
    if any(path in route_text for path in ['/auth/login', '/auth/signup', '/auth/register', '/auth/refresh', '/auth/logout']):
        return False

    # Skip if it's commented out
    if route_text.strip().startswith('//'):
        return False

    # All other routes should have authorizer
    return True

def add_authorizer(match):
    """Add authorizer to route if needed"""
    full_match = match.group(0)

    # Skip if already has authorizer
    if 'authorizer:' in full_match:
        return full_match

    # Skip if shouldn't have authorizer
    if not should_have_authorizer(full_match):
        return full_match

    # Add authorizer before the closing brace
    prefix = match.group(1)
    spacing = match.group(2)
    suffix = match.group(3)

    # Ensure proper comma placement
    if not prefix.rstrip().endswith(','):
        prefix = prefix.rstrip() + ','

    return f"{prefix} authorizer: httpAuthorizer{spacing}{suffix}"

# Apply the fix
content = re.sub(route_pattern, add_authorizer, content)

# Write the fixed content back
with open('D:/barkbase-react/aws/cdk/lib/cdk-stack.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed: Added httpAuthorizer to all authenticated routes")

# Count how many routes have authorizer now
matches = re.findall(r'authorizer:\s*httpAuthorizer', content)
print(f"Total routes with httpAuthorizer: {len(matches)}")