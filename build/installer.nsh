!macro preInit
  IfFileExists "D:\\" 0 +3
    StrCpy $INSTDIR "D:\Program Files\${PRODUCT_NAME}"
    CreateDirectory "D:\Program Files\${PRODUCT_NAME}"
!macroend