module Age (
  ageDescription
  ) where

import Prelude
import Types

ageDescription :: Age -> Array String
ageDescription Stone = 
  [ """You are a member of the hardy but technologically primitive Clickonian
  people. The other Clickonians generally defer to you when it comes to making
  important decisions. It is your task to shepherd your people through the
  Stone Age into a brighter, more prosperous future."""
  , """The tribe must develop various technologies and cultural achievements 
  to stand any hope of surviving more than a few years.""" ]
