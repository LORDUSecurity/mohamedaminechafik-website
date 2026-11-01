# -*- coding: utf-8 -*-
"""Builds site/assets/js/data.js from the skills workbook + hand-written copy."""
import json, re, os

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = json.load(open(os.path.join(HERE, "raw.json"), encoding="utf-8"))
SKILLS = RAW["SKILLS"]
CATS = RAW["CATEGORIES"]

OUT = os.path.join(HERE, "..", "..", "site", "assets", "js", "data.js")

# Museum is the gallery, not a subject: its rows are dropped.
DROP_PROJECT = "museum"
# Graphics & Creative Coding only ever had the museum, so its category goes too.
DROP_CAT = "G"

# Employer-facing packages replace the workbook's technical layers: each one is
# a thing a hiring manager filters on, and each expands into its own sub-skills.
PACKAGES = [
 dict(id="fullstack", name="Fullstack", hue=196,
      groups=[("backend", "Backend"), ("frontend", "Frontend"),
              ("databases", "Databases"), ("auth", "Auth & access")]),
 dict(id="ai", name="AI & Data", hue=285,
      groups=[("ml", "Machine learning"), ("nlp", "NLP & search"),
              ("data", "Data preparation")]),
 dict(id="cloud", name="Cloud & DevOps", hue=242,
      groups=[("cloud", "Cloud"), ("delivery", "Delivery"),
              ("environments", "Environments")]),
 dict(id="security", name="Security", hue=2,
      groups=[("offensive", "Offensive testing"), ("hardening", "Hardening")]),
 dict(id="network", name="Networks", hue=152,
      groups=[("access", "Access & AAA"), ("ops", "Operations"),
              ("detection", "Detection")]),
 dict(id="languages", name="Languages", hue=325,
      groups=[("web", "Frontend"), ("server", "Backend"),
              ("query", "Databases"), ("contracts", "Smart contracts")]),
 dict(id="quality", name="Quality & Docs", hue=48,
      groups=[("testing", "Testing"), ("communication", "Documentation")]),
]

# Workbook category → package/group, with the handful of skills that sit
# somewhere other than their old layer.
BASE = {"B": ("fullstack", "backend"), "F": ("fullstack", "frontend"),
        "R": ("fullstack", "databases"), "A": ("fullstack", "auth"),
        "D": ("ai", "ml"), "S": ("security", "offensive"),
        "N": ("network", "access"), "T": ("quality", "testing"),
        "W": ("quality", "communication"), "P": ("cloud", "delivery")}
LANG_G = {"python": "server", "php": "server", "java": "server",
          "solidity": "contracts", "javascript": "web", "typescript": "web",
          "html-css": "web", "sql": "query"}
AI_G = {"large-scale-data-wrangling": "data",
        "text-language-detection": "nlp", "full-text-search": "nlp",
        "grounded-retrieval-rag": "nlp", "document-extraction": "nlp"}
SEC_G = {"security-headers-request-filtering": "hardening",
         "safe-testing-guardrails": "hardening",
         "threat-modelled-delivery": "hardening"}
NET_G = {"network-simulation": "ops",
         "device-cli-parsing-topology-reconstruction": "ops",
         "network-detection-datasets": "detection"}

def placement(sid, old):
    if old == "L": return ("languages", LANG_G.get(sid, "web"))
    if old == "D": return ("ai", AI_G.get(sid, "ml"))
    if old == "S":
        if sid == "network-detection-datasets": return ("network", "detection")
        return ("security", SEC_G.get(sid, "offensive"))
    if old == "N": return ("network", NET_G.get(sid, "access"))
    if old == "A":
        if sid == "credential-secret-protection": return ("security", "hardening")
        return ("fullstack", "auth")
    if old == "P":
        if sid == "local-environment-control": return ("cloud", "environments")
        return ("cloud", "delivery")
    return BASE[old]

ICON = {
    "python": "brand:python", "php": "brand:php", "java": "brand:openjdk",
    "javascript": "brand:javascript", "typescript": "brand:typescript",
    "sql": "brand:mysql", "solidity": "brand:solidity", "html-css": "brand:html5",
    "web-application-frameworks": "frame", "rest-api-design": "api",
    "server-side-validation": "validate", "file-upload-handling": "upload",
    "templating-view-composition": "layout",
    "authentication": "key", "role-based-access-control": "roles",
    "credential-secret-protection": "vault",
    "single-page-application-architecture": "spa", "design-system-styling": "swatch",
    "large-scale-data-wrangling": "table", "gradient-boosted-models": "trees",
    "probability-calibration": "gauge", "class-imbalance-handling": "scales",
    "feature-selection": "funnel", "unsupervised-methods": "clusters",
    "gpu-computing": "chip", "model-evaluation-benchmarking": "chart",
    "text-language-detection": "textscan", "full-text-search": "search",
    "grounded-retrieval-rag": "graph", "document-extraction": "extract",
    "vulnerability-reproduction": "replay", "cross-site-scripting-testing": "xss",
    "sql-injection-testing-prevention": "sqli",
    "automated-crawling-attack-surface-mapping": "crawl",
    "safe-testing-guardrails": "guard", "security-headers-request-filtering": "headers",
    "network-detection-datasets": "packets", "threat-modelled-delivery": "threat",
    "network-access-control": "nac", "aaa-radius-tacacs": "radius",
    "identity-platform-architecture": "identity", "network-simulation": "topology",
    "device-cli-parsing-topology-reconstruction": "cli",
    "relational-schema-design": "schema", "migrations-seeding": "migrate",
    "transactions-integrity": "txn", "database-engines": "database",
    "orm-use": "orm", "unit-integration-testing": "test",
    "headless-browser-verification": "headless",
    "test-scaffolding-awareness": "scaffold", "build-packaging": "box",
    "dependency-management": "deps", "version-control-publication": "branch",
    "local-environment-control": "terminal", "technical-reporting": "report",
    "evidence-led-claims": "evidence", "bilingual-working-fr-en": "globe",
}

# Tag labels are what an employer scans for, not what the workbook recorded:
# the specific method lives in the hover note, the tag stays a known term.
RENAME = {
 "rest-api-design": "REST APIs",
 "server-side-validation": "Input validation",
 "file-upload-handling": "File uploads",
 "single-page-application-architecture": "Single-page apps",
 "design-system-styling": "Design systems",
 "relational-schema-design": "Schema design",
 "migrations-seeding": "Migrations",
 "transactions-integrity": "Transactions",
 "orm-use": "ORMs",
 "database-engines": "MariaDB & SQLite",
 "role-based-access-control": "Roles & permissions",
 "text-language-detection": "AI-text detection",
 "grounded-retrieval-rag": "RAG",
 "document-extraction": "Document parsing",
 "large-scale-data-wrangling": "Data cleaning",
 "cross-site-scripting-testing": "XSS",
 "sql-injection-testing-prevention": "SQL injection",
 "credential-secret-protection": "Secrets management",
 "security-headers-request-filtering": "Security headers",
 "threat-modelled-delivery": "Threat modelling",
 "safe-testing-guardrails": "Safe testing",
 "network-access-control": "NAC (802.1X)",
 "identity-platform-architecture": "Identity platform",
 "device-cli-parsing-topology-reconstruction": "Network automation",
 "network-detection-datasets": "Intrusion detection",
 "build-packaging": "Build & release",
 "version-control-publication": "Git & releases",
 "local-environment-control": "Reproducible environments",
 "cloud-cost-spot-price-analysis": "Cloud cost analysis",
 "unit-integration-testing": "Automated tests",
 "headless-browser-verification": "Browser testing",
 "test-scaffolding-awareness": "Test coverage caveats",
 "bilingual-working-fr-en": "Multilingual working",
}

# Several workbook rows were one employer concept split across methods; they
# become a single tag whose per-project note keeps the specifics.
MERGES = [
 dict(id="machine-learning", name="Machine learning", cat="ai", grp="ml", icon="trees",
      defn="Fitting and comparing models on tabular data — boosted trees, clustering, feature selection, class weights.",
      parts=["gradient-boosted-models", "unsupervised-methods", "feature-selection", "class-imbalance-handling", "gpu-computing"],
      uses={
        "cse": ("XGBoost for both stages, variance and mutual-information feature selection, DBSCAN / KMeans / GMM compared on silhouette, ARI and NMI, class weights instead of SMOTE; RAPIDS GPU variants (cuml, cupy) re-run the stages.", "stage A / stage B scripts, sampling stage, unsupervised stage, GPU variants of the stage scripts"),
        "cloud": ("Correlation and score plots used to drop redundant columns before the fit.", "shots/03-correlation-matrix.png, bench.md"),
      }),
 dict(id="model-evaluation", name="Model evaluation", cat="ai", grp="ml", icon="chart",
      defn="Scoring and calibrating models so a number means something at the chosen threshold.",
      parts=["probability-calibration", "model-evaluation-benchmarking"],
      uses={
        "litmus": ("A Node harness calibrates lanes and sweeps bands over a 48-text holdout.", "benchmark/calibrate.js, band-sweep.js"),
        "cse": ("Calibrated scores around stage A with the chosen cut-off shipped as a file; stage outputs judged per class, not by accuracy.", "stageA_threshold.pkl, evaluation scripts"),
        "cloud": ("Linear, polynomial and random forest scored on the same 80/20 split with R², RMSE and MAE.", "bench.md, model_run.json"),
      }),
 dict(id="penetration-testing", name="Penetration testing", cat="security", grp="offensive", icon="replay",
      defn="Enumerating the attack surface, then proving each flaw with a replay instead of a guess.",
      parts=["vulnerability-reproduction", "automated-crawling-attack-surface-mapping"],
      uses={
        "fixproof": ("The crawl builds the attack-surface map first; the same payload is replayed pre- and post-patch to show the delta.", "browser_crawler.py, surface_mapper, checks/xss.py"),
        "pentest": ("Recon and scanner passes enumerate headers, paths and parameters; the exploit module then replays SQLi and command injection on the bundled mock target.", "modules/recon.py, modules/scanner.py, modules/exploit.py"),
      }),
 dict(id="technical-writing", name="Technical writing", cat="quality", grp="communication", icon="report",
      defn="Writing the work up — report, dictionary, appendix — with the evidence each claim rests on.",
      parts=["technical-reporting", "evidence-led-claims"],
      uses={
        "crypto": ("A full report plus a UML dictionary beside the code; manual run screenshots as the delivery evidence.", "REPORT.md, UML_DICTIONARY.md, CryptoMarket_Report.pdf, screenshots/"),
        "raxag": ("A bilingual usage guide shipped with the exe.", "resume: bilingual guide"),
        "cloud": ("The five session write-ups and the SPSS appendix that go with the notebook.", "SPSS/*.spv, EVIDENCE.md"),
      }),
 dict(id="vulnerability-testing", name="Vulnerability testing", cat="security", grp="offensive", icon="evidence",
      defn="Fire the payload, prove it lands, then prove the patch holds — XSS and SQLi from both sides.",
      parts=["cross-site-scripting-testing", "sql-injection-testing-prevention"],
      uses={
        "fixproof": ("Injection and XSS checks replayed before and after the patch; the XSS verdict is three-state — reflected, unescaped, then confirmed by an alert dialog in headless Chromium.", "checks/xss.py dialog catcher, tests covering sqli"),
        "gameverse": ("The defensive side: a global filter over every response closes XSS, and prepared statements only — no createStatement anywhere in the repositories.", '@WebFilter("/*") SecurityFilter, UserRepository, ModRepository'),
        "pentest": ("Reflected XSS payloads and time/error-based SQLi probes fired at the mock target, both confirmed in the report output.", "report_self_xss.html, self_xss_proof.txt, live_run.json, modules/scanner.py"),
      }),
 dict(id="auth-access-control", name="Auth & access control", cat="fullstack", grp="auth", icon="key",
      defn="Login that survives a session hijack, and gates that keep every role in its lane.",
      parts=["authentication", "role-based-access-control"],
      uses={
        "crypto": ("bcrypt hashes signed into JWTs verified per request; requireRole middleware separates buyer, seller and admin routes.", "backend/routes/auth.js, middleware/authMiddleware.js"),
        "kids": ("The full laravel/ui scaffold — login, register, reset, verify — with AdminMiddleware gating the /admin group and a CLI promotion path.", "app/Http/Controllers/Auth/*, AdminMiddleware.php, user:make-admin"),
        "gameverse": ("Login invalidates the pre-auth session before issuing a new one; SecurityFilter answers 403 on /AdminController without an admin session, not a redirect.", "LoginController oldSession.invalidate(), SecurityFilter.java, error403.jsp"),
        "litmus": ("Admin calibrates per-model thresholds and steers the endpoint lanes; a signed-in user's own key beats the admin's shared one and history stays owner-scoped — the packaged exe runs the same app in single-owner mode.", "backend/app.py, db.seed_admin"),
        "ise": ("Identity is the product: logins centralised on a policy service.", "resume: Cisco ISE, AAA"),
      }),
 dict(id="database-engineering", name="Database engineering", cat="fullstack", grp="databases", icon="database",
      defn="Schemas with real keys, migrations as code, transactions where money moves — on MariaDB, SQLite and H2.",
      parts=["relational-schema-design", "migrations-seeding", "transactions-integrity", "database-engines", "orm-use"],
      uses={
        "crypto": ("Carts, orders, order_items and payments with FKs and ENUM roles/statuses; checkout wrapped in beginTransaction / commit / rollback on MariaDB/InnoDB via mysql2.", "database/bootstrap.sql, backend/routes/orders.js"),
        "kids": ("Laravel migrations for every table, an admin seeder, and Eloquent models with $fillable and casts.", "database/migrations, database/seeders/AdminUserSeeder.php, app/Models/*"),
        "esi": ("Django migrations across the catalogue apps; the ORM querysets sit on SQLite carrying the FTS5 index.", "kmprj */migrations, catalog/models.py, config/settings.py"),
        "gameverse": ("MariaDB driver with H2 and SQLite for local runs — all three shipped inside the jar.", "pom.xml dependencies"),
      }),
 dict(id="validation-uploads", name="Validation & upload handling", cat="fullstack", grp="backend", icon="validate",
      defn="Every request body validated and every upload constrained before it touches storage.",
      parts=["server-side-validation", "file-upload-handling"],
      uses={
        "kids": ("Validator rules on admin content entry — size:1, mimes:mp3,wav, difficulty 1-5; pronunciation audio deleted together with its record.", "AdminController::addLetter, Storage::disk('public')->delete"),
        "gameverse": ("Form handling validated in controllers before any repository call; mod uploads behind an extension allowlist with SVG explicitly refused.", "src/main/java/controller, upload handling"),
        "crypto": ("multer diskStorage, up to five product images per listing.", "backend/routes/seller.js upload.array('images', 5)"),
        "fixproof": ("Pydantic models so a verdict cannot arrive as a loose dict.", "models: GuardResult, TestCase, AttackSurface"),
      }),
 dict(id="build-release-git", name="Build, deps & Git", cat="cloud", grp="delivery", icon="deps",
      defn="Reproducible delivery: pinned dependencies, packaged artefacts and a publishable history.",
      parts=["build-packaging", "dependency-management", "version-control-publication"],
      uses={
        "gameverse": ("Maven shade for a portable jar plus a war for a real Tomcat, coordinates pinned to embedded Tomcat 9.0.104; public GitHub Classroom history.", "pom.xml, github.com/LORDUSecurity/gameverse-academy"),
        "raxag": ("The whole toolset compiled into one Windows exe.", "resume: PyInstaller"),
        "kids": ("Vite 6 compiling Sass, Bootstrap JS and the app entry; composer.json pinned to PHP ^8.2 / Laravel ^12.", "vite.config.js, composer.lock"),
        "crypto": ("Vite 8 for the React client, Truffle for the contract.", "frontend/package.json, contracts/truffle-config.js"),
        "pentest": ("One PyInstaller exe that starts the dashboard, the mock target and the reporter together.", "sample build, 35,782,356 B"),
        "fixproof": ("pyproject pinning typer, rich, requests, bs4, lxml, playwright, pydantic, pytest.", "pyproject.toml"),
        "esi": ("Public repo kept to one clean commit with the course PDFs left untracked.", "github.com/LORDUSecurity/esi-wiki"),
      }),
 dict(id="docker-reproducible", name="Docker & reproducible runs", cat="cloud", grp="environments", icon="clusters",
      defn="One command starts the stack; results re-run from pinned seeds and named library versions.",
      parts=["docker-compose", "local-environment-control"],
      uses={
        "raxag": ("docker compose up starts the n8n controller alongside the parser services — the whole pipeline in one command.", "docker-compose.yml"),
        "gameverse": ("The app boots its own servlet container on 8080 under /gameverseacademy.", "Main.java"),
        "cloud": ("A fixed seed, a pinned 80/20 split and a script that says which library versions produced the table.", "cloud_price_bench.py, bench.md"),
      }),
 dict(id="automated-testing", name="Automated & browser testing", cat="quality", grp="testing", icon="test",
      defn="Suites that re-run before and after the change — pytest counts, headless replays, and honest coverage notes.",
      parts=["unit-integration-testing", "headless-browser-verification", "test-scaffolding-awareness"],
      uses={
        "fixproof": ("51 pytest checks across guard, xss, sqli, surface mapper, session store and retest — payloads replayed in headless Chromium with a dialog catcher.", "tests/, browser_crawler.py, checks/xss.py"),
        "raxag": ("629 checks behind the shipped exe.", "resume: 629 passing checks"),
        "pentest": ("Four pytest checks over the parsers and detectors, re-run for the pack.", "tests/test_modules.py, EVIDENCE.md"),
        "kids": ("Only the stock ExampleTest files exist — no real coverage behind the app.", "caveat: tests/Feature/ExampleTest.php assertStatus(200)"),
        "crypto": ("No automated tests; screenshots are the evidence.", "caveat: contracts/test/ holds only .gitkeep"),
      }),
 dict(id="rag-retrieval", name="RAG & document retrieval", cat="ai", grp="nlp", icon="graph",
      defn="Answers out of your own documents: extraction, an indexed search, retrieval that cites.",
      parts=["grounded-retrieval-rag", "full-text-search", "document-extraction"],
      uses={
        "esi": ("PDF text with empty-password decrypt and docx/pptx by unzipping their XML, into a SQLite FTS5 index ranked by bm25 and accent-folded — behind a four-tier assistant: local answer, index, provider, keyless.", "catalog/corpus.py _pdf_text/_ooxml_text, aichat/views.py"),
        "litmus": ("PDF, txt, md and docx ingestion for the detector.", "backend/extract.py, pypdf + PyMuPDF fallback"),
      }),
 dict(id="nac-identity", name="NAC & identity (ISE, 802.1X, RADIUS)", cat="network", grp="access", icon="nac",
      defn="One policy service for wired, wireless and VPN logins, with per-port VLANs.",
      parts=["network-access-control", "aaa-radius-tacacs", "identity-platform-architecture"],
      uses={
        "ise": ("Cisco ISE deployed as Policy Admin, Policy Service and Monitoring personas; 802.1X on the wired edge with MAB fallback and dynamic VLAN assignment carried in the RADIUS reply, device admin separated on TACACS+.", "resume: Cisco ISE deployment, RADIUS / TACACS+"),
      }),
 dict(id="lab-automation", name="Lab simulation & network automation", cat="network", grp="ops", icon="topology",
      defn="Build the network as a lab, then parse it back: device dumps into tables and link maps.",
      parts=["network-simulation", "device-cli-parsing-topology-reconstruction"],
      uses={
        "ise": ("The whole deployment built as an EVE-NG lab.", "resume: EVE-NG"),
        "raxag": ("Parsers per service, with LLDP neighbour rows stitched back into a link map.", "resume: CLI parsers, LLDP topology rebuild"),
      }),
 dict(id="aws-cloud-cost", name="AWS & cloud cost", cat="cloud", grp="cloud", icon="cloudcost",
      defn="Working on AWS from the price sheet up: S3 data pulls, spot-price modelling, cost-aware runs.",
      parts=["aws", "cloud-cost-spot-price-analysis"],
      uses={
        "cse": ("CIC-IDS2018 AWS export — 6,320,003 flow records pulled from the S3 bucket the dataset ships in; the three-stage cascade re-executed from stored CSVs on cloud infrastructure.", "CSE-CIC-IDS2018-on-AWS/Datasets/, bench.md"),
        "cloud": ("294,183 EC2 spot-price rows across instance families, cleaned to 294,086 and scored on the notebook's own split.", "Datasets/ec2_raw.csv, Datasets/ec2_final_clean.csv, model_run.json"),
      }),
 dict(id="hardening-guardrails", name="Hardening & guardrails", cat="security", grp="hardening", icon="guard",
      defn="Bounds the tooling refuses to cross: loopback-only targets, response headers, rate limits.",
      parts=["safe-testing-guardrails", "security-headers-request-filtering"],
      uses={
        "fixproof": ("Loopback allowlist resolves the hostname and refuses any other IP, asserted in every check.", "guard.py, asserted in every check"),
        "pentest": ("Runs bound to the loopback mock target; the LLM stage is optional and off in the shipped sample.", "README.md, EVIDENCE.md"),
        "gameverse": ("CSRF and CSP headers, X-Frame-Options, nosniff, direct JSP access blocked.", "SecurityFilter"),
        "litmus": ("Double-submit CSRF compared with hmac.compare_digest, 8 calls per 900s.", "security.py"),
      }),
]

# The generic "web frameworks" and "single-page apps" rows said nothing an
# employer can filter on; they become the frameworks actually shipped here.
FRAMEWORKS = [
 dict(id="react", name="React", cat="fullstack", grp="frontend", icon="brand:react",
      defn="Component-based UI with routing and context state, talking to a separate API.",
      uses={
        "esi": ("React 18.3 with React Router 6.26 over the Django API — catalogue, search and the assistant panel.", "frontend/src, frontend/package.json"),
        "crypto": ("React 19 with Router 7 and context providers for auth and cart.", "frontend/src/context/{AuthContext,CartContext}.jsx"),
      }),
 dict(id="angular", name="Angular", cat="fullstack", grp="frontend", icon="brand:angular",
      defn="Standalone components, typed services and a dev proxy onto the API.",
      uses={
        "litmus": ("Angular 22 standalone components with a dev proxy to the API.", "frontend/src, proxy.conf.json"),
      }),
 dict(id="django", name="Django", cat="fullstack", grp="backend", icon="brand:django",
      defn="Server-side MVC with an ORM, migrations and Django REST Framework.",
      uses={
        "esi": ("Django 5.2 with DRF 3.18; pagination configured centrally and search served from the app itself.", "backend/config/settings.py, backend/catalog/"),
      }),
 dict(id="laravel", name="Laravel", cat="fullstack", grp="backend", icon="brand:laravel",
      defn="Routes, controllers, Eloquent models and Blade views in one framework.",
      uses={
        "kids": ("Laravel 12 — routes, controllers, Eloquent and Blade inheritance for the admin CRUD forms.", "routes/web.php, app/Http/Controllers, admin/lessons/form.blade.php"),
      }),
 dict(id="express", name="Express", cat="fullstack", grp="backend", icon="brand:express",
      defn="Minimal Node HTTP layer: routers mounted per domain, JSON in and out.",
      uses={
        "crypto": ("Express 4 with one router per domain behind the MariaDB pools.", "backend/routes/{auth,products,orders,seller,admin}.js"),
      }),
 dict(id="flask", name="Flask", cat="fullstack", grp="backend", icon="brand:flask",
      defn="Small Python web apps and dashboards, app factory and WSGI entry point.",
      uses={
        "litmus": ("Flask 3 application factory with a WSGI entry point.", "backend/app.py, wsgi.py"),
        "pentest": ("A Flask dashboard that runs the pipeline and holds the last report links.", "app.py (sample build)"),
      }),
 dict(id="java-servlets", name="Java servlets", cat="fullstack", grp="backend", icon="brand:apachetomcat",
      defn="Servlets, JSP and JSTL on an embedded servlet container — no framework in between.",
      uses={
        "gameverse": ("Vanilla servlets and JSP/JSTL as the MVC and view layer on embedded Tomcat.", "Main.java (new Tomcat() + addWebapp), src/main/webapp"),
      }),
 dict(id="n8n", name="n8n", cat="cloud", grp="delivery", icon="scaffold",
      defn="Node-based workflow automation: HTTP triggers, function nodes and file watchers wired into a scheduled pipeline.",
      uses={
        "raxag": ("The config-parser pipeline: n8n watches a folder of `show running-config` dumps, fans out to the nine Python services and writes the workbook back.", "n8n/, docker-compose.yml (n8n-config-parser-pipeline)"),
        "litmus": ("The detector also ships as three committed workflows — AI-only (14 nodes), full pipeline (25) and human-review queue (7) — with the parsing in the workflow's own code nodes and every credentials map left empty.", "ai-text-detector/n8n/*.json"),
      }),
 dict(id="docker-compose", name="Docker Compose", cat="cloud", grp="environments", icon="clusters",
      defn="Containerised stacks: services, volumes and ports declared in one compose file.",
      uses={
        "raxag": ("Runs the n8n controller alongside the parser services so the whole pipeline starts with `docker compose up`.", "docker-compose.yml"),
      }),
 dict(id="pyinstaller", name="PyInstaller", cat="cloud", grp="delivery", icon="box",
      defn="Freeze a Python program into a single-file executable — the last step before hand-to-hand delivery.",
      uses={
        "litmus": ("Offline detection engine packaged as `litmus-AI-Text-Detector.exe` (43.7 MB).", "spec files, build scripts"),
        "raxag": ("Nine services compiled to `raxag.exe` (248 files, 113.2 MB onedir), then Inno Setup wraps the installer.", "build_exe.bat, raxag.spec"),
        "pentest": ("Agent + Flask dashboard as one 34.1 MB exe.", "spec files"),
        "crypto": ("Marketplace stack packaged as `cryptomarket.exe` (51.4 MB).", "spec files"),
        "cse": ("Case-study runner as `cse-ids-case-study.exe` (9.6 MB).", "spec files"),
        "cloud": ("Cloud price benchmark as `cloud-cost-prediction.exe` (10.0 MB).", "spec files"),
      }),
 dict(id="aws", name="AWS", cat="cloud", grp="cloud", icon="cloudcost",
      defn="Public-cloud datasets and price sheets: EC2 spot feeds and S3-hosted corpora.",
      uses={
        "cse": ("CIC-IDS2018 AWS export — 6,320,003 flow records pulled from the S3 bucket the dataset ships in.", "CSE-CIC-IDS2018-on-AWS/Datasets/"),
        "cloud": ("294,183 EC2 spot-price rows across instance families, cleaned to 294,086.", "Datasets/ec2_raw.csv"),
      }),
 dict(id="langchain", name="LangChain", cat="ai", grp="ml", icon="graph",
      defn="ReAct agent loop over typed tools; the LLM stage stays optional so the pipeline runs offline.",
      uses={
        "pentest": ("Four `@tool` wrappers (recon, scan, exploit, report) behind a ReAct planner; disabled in the shipped build so runs reproduce offline.", "agent.py, tools/"),
      }),
 dict(id="jupyter", name="Jupyter", cat="ai", grp="ml", icon="textscan",
      defn="Notebook-driven analysis: code, output and prose in one artefact, re-runnable from stored data.",
      uses={
        "cse": ("The whole three-stage cascade runs as a notebook, re-executed from the stored 5.0 GB of CSVs.", "Cloud_Oriented_Intrusion_Detection_Modeling.ipynb"),
        "cloud": ("Five-session regression study as one notebook, ladder re-measured from `ec2_final_clean.csv`.", "G12_regression_seance_1_2_3_4_5final.ipynb"),
      }),
 dict(id="spss", name="SPSS", cat="ai", grp="ml", icon="graph",
      defn="Statistical workbench for the cross-check: distributions, correlations and regression runs kept as reviewable output documents.",
      uses={
        "cloud": ("Sessions 1–3 cross-checked outside the notebook: 7 `.spv` output documents — histograms, boxplots, simple and multiple regression — plus the S1–S3 write-up.", "SPSS/S1 S2 S3/*.spv, spss rapports_s1-2-3.pdf"),
      }),
 dict(id="wireshark", name="Wireshark / pcap", cat="network", grp="ops", icon="packets",
      defn="Read a capture: filter, follow the stream, count what actually crossed the wire.",
      uses={
        "ise": ("RADIUS and 802.1X handshakes traced packet-by-packet across the wired, wireless and VPN flows.", "network.pkt, shot_eve_topology_basic.png"),
        "pentest": ("Captures reviewed against the mock target during the exploit stage.", "network.pkt"),
      }),
]

# Their workbook originals are fully represented by the rows above.
DROP_SKILLS = {"web-application-frameworks", "templating-view-composition",
               "single-page-application-architecture"}

def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

# ---------------------------------------------------------------- projects ---
P = {
 "litmus": dict(
  name="Litmus", kind="Project", output="Web app + exe", year="2026", major=True, accent="#ffd23f",
  logo="assets/logos/litmus.svg", order=1, cuts=["tr", "br"],
  desc="A platform that flags AI-written text: an Angular 22 front end, an offline "
       "Python engine, and a benchmark that ranks the detectors against each other. "
       "48 models were measured over a 48-text human/AI corpus — 1,090 scored "
       "decisions, 869 right, a pooled accuracy of 0.7972 — with coverage reported "
       "beside accuracy, because the best model decides 47 of 48 texts and the worst "
       "answers 3. Provider keys are encrypted at rest, so no plaintext secret ships.",
  stats=[["0.7972", "pooled accuracy"], ["48", "detectors ranked"], ["1,090", "verdicts tested"],
         ["offline", "engine, no cloud"], ["4", "provider tiers"], ["0", "plaintext keys"]],
  images=["01-detect.png", "02-ranking.png", "03-history.png", "04-models-keys.png", "05-parameters.png"],
  hero="02-ranking.png",
  links={"site": "https://ai-text-ranking-630tcvp9y1c.qoder.website",
         "repo": "https://github.com/LORDUSecurity/litmus-ai-text-detector"},
  sample=dict(id="1gBA6zsvmzqTs4Pvi_zoqSU6Kh1x2BZAU", name="litmus-AI-Text-Detector.exe", bytes=43657322, kind="exe")),

 "esi": dict(
  name="ESI Wiki", kind="Project", output="Web app + exe", year="2026", major=True, accent="#4f8dff",
  logo="assets/logos/esi-wiki.svg", order=2, cuts=["tr", "bl"],
  desc="A school knowledge base for the ESI course archive: Django and React over "
       "SQLite, with 1,403 documents cut into 19,646 chunks and mirrored into an FTS5 "
       "index ranked by bm25. The assistant answers from the corpus itself on four "
       "tiers — the database first, the index second, a model last — measured at "
       "0.056 s for an FAQ-table answer against 6.06 s for a corpus excerpt, with all "
       "14 read endpoints landing between 13 and 85 ms.",
  stats=[["0.056 s", "FAQ answer"], ["13–85 ms", "API reads"], ["1,403", "documents searched"],
         ["19,646", "chunks indexed"], ["4", "answer tiers"], ["keyless", "zip you can run"]],
  images=["shot_home.png", "shot_module_detail.png", "shot_admin_dashboard.png",
          "shot_assistant_local.png", "shot_assistant_corpus_masked.png",
          "shot_esihub.png", "shot_home_django_built.png", "shot_admin_changelist.png",
          "shot_bug1_tables_hijack.png", "shot_admin_login.png"],
  hero="shot_home.png",
  links={"repo": "https://github.com/LORDUSecurity/esi-wiki"},
  sample=dict(id="1uTSKzTckSgYY-K0HperE4LT4kGA6wbDk", name="esi-wiki-keyless-2026-10-18.zip", bytes=60014124, kind="zip")),

 "cse": dict(
  name="CSE-CIC-IDS2018", kind="Project", output="Notebook", year="2026", major=True, accent="#ff8a3d",
  logo="assets/logos/cse-ids.svg", order=3, cuts=["tl", "tr"],
  desc="A three-stage machine-learning cascade over the 6,320,003 network-flow records "
       "of the CIC-IDS2018 AWS export: a calibrated sentinel that decides benign or "
       "attack, a classifier that names the vector, and a rare-attack model that works "
       "where SMOTE stops helping. Every number here was re-executed from the stored "
       "5.0 GB of CSVs rather than read off the notebook — stage B reaches 0.99986 over "
       "1,325,843 attack rows, and the hard test still calls 169 of 176 Infilteration "
       "flows benign, which is the finding an accuracy of 0.9821 hides.",
  stats=[["0.99986", "benign/attack gate"], ["0.9350", "rare-attack macro-F1"],
         ["0.9821", "hard-test accuracy"], ["0.0745", "the gap it admits"],
         ["6.32M", "flows re-run"], ["3", "model stages"]],
  images=["01-notebook-top.png", "02-stage-c-summary.png", "03-stage-b-results.png",
          "04-sanity-checks.png", "05-harder-test-cell.png", "06-pca-variance.png"],
  hero="03-stage-b-results.png", video="cse-walkthrough-ml.mp4",
  links={"drive": "https://drive.google.com/drive/folders/1PKyOKveEUzzTAE0-vIWtEWkITH0CS6EH"},
  sample=None),

 "crypto": dict(
  name="CryptoMarket", kind="Project", output="Web app", year="2026", major=True, accent="#a06bff",
  logo="assets/logos/cryptomarket.svg", order=4, cuts=["br"],
  desc="A multi-vendor marketplace with a deliberate Web2/Web3 split: browsing, carts, "
       "orders and profiles live in MariaDB behind an Express API — 13 tables, 3 roles, "
       "a JWT over bcrypt at cost 10 — while settlement runs on a 68-line Ethereum "
       "contract that takes a 2 % platform fee and writes the balance down before the "
       "external call. A Node listener reconciles `PaymentProcessed` back into the "
       "off-chain order. Measured on loopback: `/api/products` in 2.8–6.4 ms, across "
       "3,751 lines of application code.",
  stats=[["2%", "platform fee"], ["auto", "order reconciled"], ["2.8–6.4 ms", "catalogue API"],
         ["68", "Solidity lines"], ["3 roles", "buyer/seller/admin"], ["13", "MariaDB tables"]],
  images=["01_home.png", "04_catalog_via_ui_login.png", "05_product_detail.png",
          "06_cart.png", "07_checkout.png", "08_order_history.png", "09_wallet.png",
          "10_seller_dashboard.png", "11_admin_dashboard.png", "02_login.png", "03_register.png"],
  hero="04_catalog_via_ui_login.png",
  links={}, sample=dict(id="1TXa99Jf987pNMZSZkyWF25VXJSc1BuIs", name="cryptomarket.exe", bytes=51360246, kind="exe")),

 "fixproof": dict(
  name="FixProof", kind="Project", output="CLI tool", year="2026", major=True, accent="#f2ede0",
  logo="assets/logos/fixproof.svg", order=5, cuts=["bl", "br"],
  desc="A localhost-only scanner and retest tool: it crawls a running app, maps its "
       "attack surface, runs passive header, cookie and CSRF checks plus active XSS and "
       "SQLi probes, then re-runs the same cases after the patch to prove the fix "
       "landed. 51 pytest checks pass in 8.27 s, 31 % line coverage placed where a "
       "wrong answer is invisible at runtime — surface_mapper at 99 %. Every request "
       "stays on 127.0.0.1.",
  stats=[["51", "checks, then re-run"], ["pass→fail", "the fix proven"], ["8.27 s", "full suite"],
         ["99%", "crawler code covered"], ["3", "XSS verdict states"], ["127.0.0.1", "nothing leaves"]],
  images=["shot_report_top.png", "shot_report.png", "shot_report_bottom.png"], hero="shot_report_top.png",
  links={"repo": "https://github.com/LORDUSecurity/Fixproof"}, sample=None),

 "gameverse": dict(
  name="GameVerse Academy", kind="Project", output="Web app", year="2026", major=True, accent="#5cffb0",
  logo="assets/logos/gameverse.svg", order=6, cuts=["tl", "br"],
  desc="A secure mod-sharing platform for a gaming community: 13 vanilla servlets and "
       "JSP on embedded Tomcat, one 30.8 MB portable jar. Sessions regenerate at login, "
       "passwords are PBKDF2-HMAC-SHA256 at 310,000 rounds, XSS and SQL injection are "
       "closed by global filters, and an unauthenticated hit on /AdminController "
       "returns 403 rather than a login redirect. Measured on the shipped jar: "
       "catalogue pages 15–34 ms, a 17.7 MB mod download in 117 ms.",
  stats=[["1 jar", "30.8 MB portable"], ["310,000", "PBKDF2 rounds"], ["403", "admin probe answer"],
         ["117 ms", "17.7 MB download"], ["15–34 ms", "catalogue page"], ["13", "servlets"]],
  images=["shot_home.png", "shot_details.png", "shot_login.png", "shot_profile.png",
          "shot_admin.png", "shot_details.png"],
  hero="shot_home.png",
  links={"repo": "https://github.com/LORDUSecurity/gameverse-academy"},
  sample=dict(id="1m5KB_N1GccXvG0H-ONwnAqkec5xki4So", name="Server-EXE V2.zip (GameVerseAcademy.exe)", bytes=113360767, kind="zip")),

 "kids": dict(
  name="Kids' Garden", kind="Project", output="Web app", year="2025", major=True, accent="#ff8fd0",
  logo="assets/logos/kids-garden.svg", order=7, cuts=["tl"],
  desc="A Laravel 12 learning platform for young children, on PHP 8.2 with Vite, Sass "
       "and Bootstrap 5 over SQLite: hand-written pages for home, login, register, "
       "lessons and games, four mini-games (Memory Match, Spelling Bee, Math Whiz, "
       "Animal Sounds) and three JSON content feeds over 25 letters, 21 numbers and 6 "
       "colours. Measured here on the built-in server with a full framework bootstrap "
       "per request: /api/numbers 0.337 s, /lessons 0.697 s.",
  stats=[["4", "mini-games"], ["25", "letters taught"], ["21", "numbers taught"],
         ["6", "colours taught"], ["3", "content feeds"], ["0.337 s", "/api/numbers"]],
  images=["01-home.png", "02-login.png", "03-register.png", "04-lessons.png",
          "05-games.png", "06-admin-content-manager.png", "10-game-memory.png",
          "11-game-math.png", "07-about-blade.png", "08-admin-dashboard-error.png"],
  hero="01-home.png",
  links={"repo": "https://github.com/LORDUSecurity/kids-garden"}, sample=None),

 "ise": dict(
  name="Cisco ISE", kind="Internship", output="PDF guide", org="Data Digital Maroc", year="2025", major=True, accent="#6dff13",
  logo="assets/logos/cisco-ise.svg", order=8, cuts=["tl", "tr", "br"],
  desc="A 19-page Cisco ISE mini guide written during the Data Digital Maroc "
       "internship: AAA, RADIUS and 802.1X built up from the protocol messages, the "
       "three ISE personas and what each one carries, wired, wireless and VPN logins "
       "traced as three separate end-to-end flows, four deployment models side by "
       "side, and a comparison of seven NAC products. A reference document for the lab "
       "rather than a product summary.",
  stats=[["19 pages", "lab-ready reference"], ["3", "login flows traced"], ["7", "NAC tools compared"],
         ["4", "deployment models"], ["3", "ISE personas"], ["758 KB", "guide PDF"]],
  images=["shot_ddm_p01_title.png", "shot_ddm_p03_wired_flow.png",
          "shot_ddm_p10_hybrid.png", "shot_ddm_p18_alternatives.png",
          "shot_eve_login.png", "shot_eve_topology_basic.png"],
  hero="shot_ddm_p03_wired_flow.png",
  links={}, sample=dict(id="1lz2-yEIxOh4Dn8erV9ijZRBfcraMNlfJ", name="ise-ddm-guide.pdf", bytes=776183, kind="pdf")),

 "raxag": dict(
  name="raxag", kind="Internship", output="Windows app", org="Raisecom", year="2025", major=True, accent="#ff453a",
  logo="assets/logos/raxag.svg", order=9, cuts=["tl", "tr", "bl"],
  desc="Nine network-integration services for Raisecom equipment: point it at a folder of "
       "`show running-config` dumps, or right-click it — the installer registers an Explorer "
       "verb — and it returns the provisioning table, an LLDP rebuild and a copy-paste HTML "
       "sheet. A ten-pattern redactor strips secrets before anything leaves the machine. One "
       "sweep of 17 real dumps gives 1,794 rows in 2.62 s median, two styled workbooks, two "
       "copier pages and a run folder whose manifest survives a crash. 629 checks green across "
       "five suites; the EN + FR guide ships with the exe.",
  stats=[["2.62 s", "dump → workbook"], ["1,794", "provisioning rows"], ["1 click", "from Explorer"],
         ["10", "redaction patterns"], ["629", "checks green"], ["EN + FR", "guide shipped"]],
  images=["shot_agg-parsing.png", "shot_normalizing.png", "shot_agg-combining.png",
          "shot_auto.png", "shot_cross-combining.png", "shot_agg-config.png"],
  hero="shot_agg-parsing.png",
  # The build is client work and the exe carries their device dumps, so it is never
  # handed out on request — the ask button would only produce a refusal.
  links={"repo": "https://github.com/LORDUSecurity/n8n-config-parser-pipeline"}, sample=None, ask=False),

 "cloud": dict(
  name="Cloud Cost Prediction", kind="Study", output="Notebook", year="2026", major=False, accent="#7ce7ff",
  logo="assets/logos/cloud-cost.svg", order=10, cuts=["tr"],
  desc="A five-session study of AWS EC2 spot pricing: 294,183 raw rows cleaned to "
       "294,086, the target chosen as log(price), then a regression ladder from linear "
       "to gradient boosting — re-measured here from the shipped CSV rather than "
       "trusted from the notebook's stored outputs. On 10 engineered features with a "
       "fixed 80/20 split: R² 0.5581 linear against 0.8347 from a 100-tree random "
       "forest in 15.07 s, where a deeper boosted model costs 80 s to fit for no gain; "
       "5-fold CV puts the recipe at 0.8239, and the ladder agrees with the notebook to "
       "about 0.004 R².",
  stats=[["0.8347", "R², random forest"], ["15.07 s", "forest fit"], ["80 s", "boosted, no gain"],
         ["0.8239", "5-fold CV"], ["294,086", "rows cleaned"], ["~0.004", "matches notebook"]],
  images=["01-notebook-top.png", "02-log-distributions.png", "03-correlation-matrix.png",
          "04-simple-regressions.png", "05-random-forest.png", "06-final-comparison.png"],
  hero="06-final-comparison.png",
  links={"drive": "https://drive.google.com/drive/folders/1fQITA9mhpnVk4iVDQLxJmrMfuIYk_duq"},
  sample=None),

 "pentest": dict(
  name="Pentest Agent", kind="Tool", output="Windows app", year="2026", major=False, accent="#ff3d81",
  logo="assets/logos/pentest-agent.svg", order=11, cuts=["bl"],
  desc="An automated pentest agent: a planner drives recon, scanning and exploit "
       "modules, then its own reporter writes PDF, HTML and JSON. The LLM stage is a "
       "real LangChain ReAct loop with four @tool wrappers, and it stays optional — off "
       "in the shipped build — so a full run reproduces offline against the bundled "
       "vulnerable mock target. One such run here ends at 5 findings and a risk score "
       "of 82/100, packaged as one 34.1 MB exe over 1,634 lines of source.",
  stats=[["1 exe", "34.1 MB packaged"], ["5", "findings surfaced"], ["82/100", "risk score"],
         ["3", "PDF, HTML, JSON"], ["4", "@tool wrappers"], ["offline", "no LLM required"]],
  images=["report-page-1.png", "report-page-2.png", "shot_report.png"], hero="report-page-1.png",
  links={}, sample=dict(id="1au4_dQlO_h9nVTgPRHTq13rd5W4v4gml", name="pentest-agent.exe", bytes=35782356, kind="exe")),
}

# ------------------------------------------------------------ extra uses ----
# Two subjects the workbook never covered; same note+evidence shape.
ADDED = {
 "python": [
  ("cloud", "The whole study: pandas frames, the sklearn regression ladder, and the re-run script that reproduces the notebook's numbers.", "cloud_price_bench.py, model_run.json"),
  ("pentest", "Agent loop, module glue and the report writer behind the dashboard.", "pentest_agent/agent.py, modules/"),
 ],
 "large-scale-data-wrangling": [
  ("cloud", "294,183 raw spot-price rows cleaned to 294,086 with 11 engineered columns before any model sees them.", "Datasets/ec2_final_clean.csv, EVIDENCE.md"),
 ],
 "feature-selection": [
  ("cloud", "Correlation and score plots used to drop redundant columns before the fit.", "shots/03-correlation-matrix.png, bench.md"),
 ],
 "model-evaluation-benchmarking": [
  ("cloud", "Linear, polynomial and random forest scored on the same 80/20 split with R², RMSE and MAE.", "bench.md, model_run.json"),
 ],
 "technical-reporting": [
  ("cloud", "The five session write-ups and the SPSS appendix that go with the notebook.", "SPSS/*.spv, EVIDENCE.md"),
 ],
 "web-application-frameworks": [
  ("pentest", "A Flask dashboard that runs the pipeline and holds the last report links.", "app.py (sample build)"),
 ],
 "rest-api-design": [
  ("pentest", "Two endpoints the dashboard drives: /api/run and /api/report.", "app.py (sample build)"),
 ],
 "vulnerability-reproduction": [
  ("pentest", "The exploit module replays SQLi and command injection against the bundled mock target.", "modules/exploit.py, live_run.json"),
 ],
 "cross-site-scripting-testing": [
  ("pentest", "Reflected XSS payloads fired at the mock target and confirmed in the report output.", "report_self_xss.html, self_xss_proof.txt"),
 ],
 "sql-injection-testing-prevention": [
  ("pentest", "Time-based and error-based probes against the mock target's search route.", "live_run.json, modules/scanner.py"),
 ],
 "automated-crawling-attack-surface-mapping": [
  ("pentest", "Recon and scanner passes enumerate headers, paths and parameters before exploitation.", "modules/recon.py, modules/scanner.py"),
 ],
 "safe-testing-guardrails": [
  ("pentest", "Runs are bound to the loopback mock target; the LLM stage is optional and off in the shipped sample.", "README.md, EVIDENCE.md"),
 ],
 "unit-integration-testing": [
  ("pentest", "Four pytest checks over the parsers and detectors, re-run here.", "tests/test_modules.py, EVIDENCE.md"),
 ],
 "build-packaging": [
  ("pentest", "One PyInstaller exe that starts the dashboard, the mock target and the reporter together.", "sample build, 35,782,356 B"),
 ],
 "role-based-access-control": [
  ("litmus", "Admin calibrates per-model thresholds and steers the endpoint lanes; a signed-in user's own key "
             "beats the admin's shared one and history stays owner-scoped — the packaged exe runs the same app "
             "in single-owner mode.", "backend/app.py, db.seed_admin"),
  ("gameverse", "SecurityFilter gates /AdminController: without an admin session the moderation vault answers "
                "403 on error403.jsp, not a redirect.", "SecurityFilter.java, AdminController, error403.jsp"),
 ],
 "javascript": [
  ("esi", "React 18.3 components are JSX — catalogue, search and the assistant panel compile into the JS bundle "
          "the Django API serves.", "frontend/src, frontend/package.json"),
  ("litmus", "The Angular 22 front end is one JS family with the rest: TypeScript source, plain-JS browser "
             "bundle, standalone components.", "frontend/src"),
 ],
 "local-environment-control": [
  ("cloud", "A fixed seed, a pinned 80/20 split and a script that says which library versions produced the table.", "cloud_price_bench.py, bench.md"),
 ],
}

# Local build paths in the workbook evidence read as clutter on a public page;
# name the tree instead of the machine it sat on.
LOCAL = {"C:\\CSE-CIC-IDS2018-on-AWS": "the CSE-CIC-IDS2018 tree",
         "C:\\Fixproof": "the FixProof tree"}

def pub(t):
    for k, v in LOCAL.items():
        t = t.replace(k, v)
    return t

# ------------------------------------------------------------- assemble ----
skills = []
for cat, name, definition, uses in SKILLS:
    if cat == DROP_CAT:
        continue
    sid = slug(name)
    if sid in DROP_SKILLS:
        continue
    u = {p: {"note": pub(n), "ev": pub(e)} for p, n, e in uses if p != DROP_PROJECT}
    for p, n, e in ADDED.get(sid, []):
        u[p] = {"note": pub(n), "ev": pub(e)}
    u = {k: v for k, v in u.items() if k in P}
    if not u:
        continue
    pkg, grp = placement(sid, cat)
    skills.append(dict(id=sid, name=name, cat=pkg, grp=grp, defn=definition,
                       icon=ICON.get(sid, "dot"), uses=u))

# The cloud study had no cloud-labelled skill in the workbook; this one names
# what it actually does with the AWS price sheets.
skills.append(dict(id="cloud-cost-spot-price-analysis", name="Cloud cost & spot-price analysis",
                   cat="cloud", grp="cloud", icon="cloudcost",
                   defn="Reading a cloud price sheet: joining AWS EC2 spot-price dumps, "
                        "taking log(price) as the target, and weighing model error against "
                        "the instance families the model recommends.",
                   uses={"cloud": {
                       "note": "294,183 raw spot-price rows joined into a 294,086-row modelling "
                               "table, scored on the notebook's own split.",
                       "ev": "Datasets/ec2_final_clean.csv, model_run.json"},
                       "cse": {
                       "note": "Three-stage ML cascade trained and evaluated on 6.32 M network flows "
                               "from the CIC-IDS2018 dataset hosted on AWS; pipeline re-executed "
                               "from stored CSVs on cloud infrastructure.",
                       "ev": "CSE-CIC-IDS2018-on-AWS/Datasets/, bench.md"}}))

skills.extend(dict(id=f["id"], name=f["name"], cat=f["cat"], grp=f["grp"],
                   defn=f["defn"], icon=f["icon"],
                   uses={k: {"note": n, "ev": e} for k, (n, e) in f["uses"].items()})
              for f in FRAMEWORKS)

by_part = {p: m for m in MERGES for p in m["parts"]}
merged, seen = [], set()
for s in skills:
    m = by_part.get(s["id"])
    if not m:
        merged.append(s)
    elif m["id"] not in seen:
        seen.add(m["id"])
        merged.append(dict(id=m["id"], name=m["name"], cat=m["cat"], grp=m["grp"],
                           defn=m["defn"], icon=m["icon"],
                           uses={k: {"note": n, "ev": e} for k, (n, e) in m["uses"].items()}))
skills = merged
for s in skills:
    s["name"] = RENAME.get(s["id"], s["name"])

# Frameworks lead their group; everything else keeps its workbook order.
pkg_order = [p["id"] for p in PACKAGES]
pkg_i = {p: i for i, p in enumerate(pkg_order)}
grp_i = {(p["id"], g): i for p in PACKAGES for i, (g, _) in enumerate(p["groups"])}
fw_i = {f["id"]: i for i, f in enumerate(FRAMEWORKS)}
skills.sort(key=lambda s: (pkg_i[s["cat"]], grp_i[(s["cat"], s["grp"])],
                           fw_i.get(s["id"], len(FRAMEWORKS))))

pkgs = []
for p in PACKAGES:
    pkgs.append(dict(id=p["id"], name=p["name"], hue=p["hue"],
                     groups=[dict(id=g, name=n) for g, n in p["groups"]],
                     n=sum(1 for s in skills if s["cat"] == p["id"])))

pkg_order = [p["id"] for p in PACKAGES]

projects = []
for key, meta in sorted(P.items(), key=lambda kv: kv[1]["order"]):
    used = [s for s in skills if key in s["uses"]]
    counts = {}
    for s in used:
        counts[s["cat"]] = counts.get(s["cat"], 0) + 1
    tags = [c for c, _ in sorted(counts.items(), key=lambda kv: (-kv[1], pkg_order.index(kv[0])))[:3]]
    proj = dict(id=key, **meta)
    proj["images"] = [re.sub(r"[.]png$", ".webp", f) for f in proj["images"]]
    proj["hero"] = re.sub(r"[.]png$", ".webp", proj["hero"])
    proj["skills"] = [s["id"] for s in used]
    proj["tags"] = tags
    projects.append(proj)

# ---------------------------------------------------------------- contact ---
# Phone, e-mail and LinkedIn come from the current CV
# (pdf/Mohamed_Amine_Chafik_CV_EN 2-10.pdf, 2 Oct 2026); the older markdown CV
# carries a placeholder LinkedIn slug, so it is not used. Instagram and
# Facebook were given by the user on 2026-11-01.
CONTACT = dict(
    name="Mohamed Amine Chafik",
    role="Cybersecurity engineering student · secure software developer",
    location="Rabat, Morocco",
    email="sim.77.stp@gmail.com",
    email_esi="mohamed-amine.chafik@esi.ac.ma",
    phone="+212 7 11 91 42 51",
    tel="+212711914251",
    whatsapp="212711914251",
    github="https://github.com/LORDUSecurity",
    linkedin="https://www.linkedin.com/in/mohamed-amine-chafik-8b747532b",
    instagram="https://www.instagram.com/amine.thelord/",
    facebook="https://www.facebook.com/amine.thelord.3",
)

# ------------------------------------------------------------- coursework --
# Skills the degree teaches that no linked work proves. They keep the shelf's
# packages and tiles, but they carry no work count: the coursework is the
# claim, so they belong beside Education rather than on the shelf.
coursework = [dict(cat=pkg, name=name) for pkg, name in RAW.get("COURSEWORK", [])]
coursework.sort(key=lambda c: (pkg_i[c["cat"]], c["name"]))

data = dict(projects=projects, skills=skills, categories=pkgs,
            coursework=coursework, contact=CONTACT)
js = ("// Generated by gen_data.py — do not edit by hand.\n"
      "window.SITE = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")
open(OUT, "w", encoding="utf-8").write(js)

print("categories", len(pkgs), "skills", len(skills), "projects", len(projects))
for p in projects:
    print(f"  {p['id']:10s} {len(p['skills']):2d} skills  tags={p['tags']}")
missing = [s["id"] for s in skills if not s["icon"] or s["icon"] == "dot"]
print("no icon:", missing)
