#!/bin/bash
# Warns Claude when editing files on main/master branch

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
  echo "WARNING: You are editing files directly on '$BRANCH' branch."
  echo "Consider creating a feature branch first: git checkout -b feat/your-feature-name"
  echo "This is a non-blocking warning — you may proceed, but please be intentional."
fi

exit 0
