# Project Setup and Running Scripts

This repository uses a local Python virtual environment to run the project scripts. Follow these steps to create the environment, install dependencies, and run the scripts.

## Prerequisites

- Ubuntu / Debian system
- `python3` installed
- Recommended: install system packages:
  ```bash
  sudo apt update
  sudo apt install python3-venv python3-full -y
  # remove any broken venv if present
rm -rf .venv

# create a new venv
python3 -m venv .venv

# activate it
source .venv/bin/activate

# upgrade pip and packaging tools inside the venv
python -m pip install --upgrade pip setuptools wheel

# install project dependencies (example)
pip install yfinance
# or install from requirements file if present
pip install -r requirements.txt

## Environment validation

/home/rcastillo/checkoutcode/lib/python/.venv/bin/python

git add README.md .gitignore
git commit -m "Add README with venv setup instructions and .gitignore"


## Dependencies' summary

Make sure pipx is installed 
if not
``` bash
sudo apt install pip
```
for many .py scripts yfinance and pandas are needed
With pip it will install the needed libraries in a virtual env 

```bash
sudo apt update
sudo apt install python3-venv python3-full -y
python3 -m venv .venv

source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
pip install yfinance


```


/home/rcastillo/.local/share/pipx/venvs/yfinance/bin/activate











