module Age (
  ageDescription
  ) where

import Prelude
import Types

ageDescription :: Age -> String
ageDescription Stone =
  """You are a member of the hardy but technologically primitive Clickonian
  people. The other Clickonians generally defer to you when it comes to making
  important decisions. It is your task to shepherd your people through the
  Stone Age into a brighter, more prosperous future."""