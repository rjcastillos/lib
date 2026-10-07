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

## How to check from the top repo if a requirements.txt file exist
[ -f requirements.txt ] && echo "exists" || echo "missing"

## How to create a requirements.txt file

python -m pip freeze > requirements.txt












