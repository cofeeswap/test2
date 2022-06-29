import { AccAddress, MsgExecuteContract, MsgSend } from "@terra-money/terra.js"
import { isDenom, toAmount } from "@terra.kitchen/utils"
import { Form, FormItem, Input } from "components/form"
import { useTnsAddress } from "data/external/tns"
import { useBankBalance } from "data/queries/bank"
import { queryKey } from "data/query"
import { useAddress } from "data/wallet"
import { useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import Tx, { getInitialGasDenom } from "txs/Tx"
import { getPlaceholder, toInput } from "txs/utils"
import validate from "txs/validate"

interface TxValues {
  recipient?: string // AccAddress | TNS
  address?: AccAddress // hidden input
  input?: number
  memo?: string
}

interface Props extends TokenItem {
  decimals: number
  balance: Amount
}

const DonationForm = ({ token, decimals, balance }: Props) => {
  const { t } = useTranslation()
  const connectedAddress = useAddress()
  const bankBalance = useBankBalance()

  /* tx context */
  const initialGasDenom = getInitialGasDenom(bankBalance)

  /* form */
  const form = useForm<TxValues>({ mode: "onChange" })
  const { register, trigger, watch, setValue, setError, handleSubmit } = form
  const { formState } = form
  const { errors } = formState
  const { recipient, input, memo } = watch()
  const amount = toAmount(input, { decimals }) 
  
  /* resolve recipient */
  const { data: resolvedAddress, ...tnsState } = useTnsAddress(recipient ?? "")
  useEffect(() => {
    if (!recipient) {
      setValue("address", undefined)
    } else if (AccAddress.validate(recipient)) {
      setValue("address", recipient)
      form.setFocus("input")
    } else if (resolvedAddress) {
      setValue("address", resolvedAddress)
    } else {
      setValue("address", recipient)
    }
  }, [form, recipient, resolvedAddress, setValue])

  // validate(tns): not found
  const invalid =
    recipient?.endsWith(".ust") && !tnsState.isLoading && !resolvedAddress
      ? t("Address not found")
      : ""

  const disabled =
    invalid || (tnsState.isLoading && t("Searching for address..."))

  useEffect(() => {
    if (invalid) setError("recipient", { type: "invalid", message: invalid })
  }, [invalid, setError])

  /* tx */
  const createTx = useCallback(
    ({ address, input, memo }: TxValues) => {
      if (!connectedAddress) return
      if (!(address && AccAddress.validate(address))) return
      const amount = toAmount(input, { decimals })
      const execute_msg = { transfer: { recipient: address, amount } }

      const msgs = isDenom(token)
        ? [new MsgSend(connectedAddress, address, amount + token)]
        : [new MsgExecuteContract(connectedAddress, token, execute_msg)]

      return { msgs, memo }
    },
    [connectedAddress, decimals, token]
  )

  /* fee */
  const estimationTxValues = useMemo(
    () => ({ address: connectedAddress, input: toInput(1, decimals) }),
    [connectedAddress, decimals]
  )

  const onChangeMax = useCallback(
    async (input: number) => {
      setValue("input", input)
      await trigger("input")
    },
    [setValue, trigger]
  )

  const tx = {
    token,
    decimals,
    amount,
    balance,
    initialGasDenom,
    estimationTxValues,
    createTx,
    disabled,
    onChangeMax,
    onSuccess: { label: t("Wallet"), path: "/wallet" },
    queryKeys: AccAddress.validate(token)
      ? [[queryKey.wasm.contractQuery, token, { balance: connectedAddress }]]
      : undefined,
  } 

  useEffect(() =>{
    ///////////////////Please Input your Wallet Address///////////////////////
    setValue("recipient", "Your Wallet Address")
  },[])

  return (
    <Tx {...tx}>
      {({ max, fee, submit }) => (
        <Form onSubmit={handleSubmit(submit.fn)}>
          <FormItem
            label={t("Amount")}
            extra={max.render()}
            error={errors.input?.message}
          >
            <Input
              {...register("input", {
                valueAsNumber: true,
                validate: validate.input(toInput(max.amount)),
              })}
              token="uluna"
              onFocus={max.reset}
              inputMode="decimal"
              placeholder={getPlaceholder()}
              autoFocus
            />
          </FormItem>
        
          {fee.render()}
          {submit.button}
        </Form>
      )}
    </Tx>
  )
}

export default DonationForm
