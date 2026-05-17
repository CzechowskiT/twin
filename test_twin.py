"""TWIN Feature Test"""
import sys
import os
from pathlib import Path

# Backend path
backend_dir = Path.cwd() / "backend"
sys.path.insert(0, str(backend_dir))

print(f"✅ Backend path: {backend_dir}")
print(f"✅ Backend exists: {backend_dir.exists()}")

# Load .env from root
env_root = Path.cwd() / ".env"
env_backend = backend_dir / ".env"

print(f"\n📄 Looking for .env:")
print(f"   Root .env: {env_root.exists()}")
print(f"   Backend .env: {env_backend.exists()}")

env_to_load = env_root if env_root.exists() else env_backend

if env_to_load.exists():
    print(f"\n📄 Loading from: {env_to_load}")
    with open(env_to_load) as f:
        for line in f:
            line = line.strip()
            if line and '=' in line and not line.startswith('#'):
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if value:
                    os.environ[key] = value
else:
    print("\n⚠️  No .env file found")

def test_imports():
    print("\n" + "="*60)
    print("🔍 TEST 1: Imports")
    print("="*60)
    try:
        from app.database.models import User, Candidate, Job
        from app.matching.matcher import calculate_match_score
        print("✅ Core imports work")
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_matching():
    print("\n" + "="*60)
    print("🔍 TEST 2: Matching Algorithm")
    print("="*60)
    try:
        from app.matching.matcher import calculate_match_score
        
        candidate = {
            "skills": ["python", "fastapi", "postgresql"],
            "preferred_job_titles": ["senior python developer"],
            "experience_years": 5,
            "desired_salary": 15000,
            "location": "warszawa",
            "cv_text": "python django fastapi postgresql docker kubernetes"
        }
        
        job = {
            "title": "Senior Python Developer",
            "requirements": "python, fastapi, postgresql, docker",
            "description": "Build backend APIs",
            "salary_min": 12000,
            "salary_max": 18000,
            "location": "Warszawa"
        }
        
        score = calculate_match_score(candidate, job)
        print(f"✅ Match score: {score:.1f}/100")
        
        if score >= 70:
            print(f"✅ HIGH QUALITY - Algorithm works great")
        elif score >= 50:
            print(f"⚠️  ACCEPTABLE - Algorithm works")
        else:
            print(f"❌ LOW SCORE - May need tuning")
        
        return score >= 50
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_env():
    print("\n" + "="*60)
    print("🔍 TEST 3: Environment Variables")
    print("="*60)
    
    required = ["DATABASE_URL", "SECRET_KEY", "FRONTEND_URL"]
    optional = ["ANTHROPIC_API_KEY", "STRIPE_SECRET_KEY", "GOOGLE_CLIENT_ID"]
    
    missing = []
    print("\n📋 Required:")
    for var in required:
        val = os.getenv(var)
        if val:
            display = val[:30] + "..." if len(val) > 30 else val
            print(f"   ✅ {var}: {display}")
        else:
            print(f"   ❌ {var}: MISSING")
            missing.append(var)
    
    print("\n📋 Optional:")
    for var in optional:
        val = os.getenv(var)
        status = "✅" if val else "⚠️ "
        print(f"   {status} {var}: {'set' if val else 'not set'}")
    
    if missing:
        print(f"\n❌ Missing {len(missing)} required vars")
        print("\n💡 Create .env in project root:")
        print("   cp .env.example .env")
        print("   # Then edit .env")
        return False
    
    print(f"\n✅ All required vars present")
    return True

def main():
    print("="*60)
    print("🧪 TWIN FEATURE TEST")
    print("="*60)
    print(f"📍 Working dir: {Path.cwd()}")
    
    results = {
        "Imports": test_imports(),
        "Matching": test_matching(),
        "Environment": test_env()
    }
    
    print("\n" + "="*60)
    print("📊 SUMMARY")
    print("="*60)
    
    passed = sum(results.values())
    total = len(results)
    
    for name, result in results.items():
        status = "✅" if result else "❌"
        print(f"{status} {name}")
    
    print(f"\n📈 Score: {passed}/{total}")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        print("\n✅ You're ready to:")
        print("   1. Start backend: cd backend && uvicorn app.main:app --reload")
        print("   2. Start frontend: cd frontend && npm run dev")
        print("   3. Recruit beta users (LinkedIn post)")
    elif passed >= 2:
        print("\n⚠️  MOSTLY WORKING")
        print("\n✅ Fix remaining issues, then start recruiting")
    else:
        print("\n❌ TOO MANY ERRORS")
        print("\n⚠️  Fix critical issues first")

if __name__ == "__main__":
    main()
