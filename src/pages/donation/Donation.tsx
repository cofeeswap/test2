import { AccAddress } from "@terra-money/terra.js"
import { Auto, Card, Page } from "components/layout"
import { useBankBalance } from "data/queries/bank"
import { useTokenBalance } from "data/queries/wasm"
import { useTokenItem } from "data/token"
import { useTranslation } from "react-i18next"
import TxContext from "txs/TxContext"
import { getAmount } from "utils/coin"
import DonationForm from "./DonationForm"

const Donation = () => {
  const { t } = useTranslation() 
  
  const bankBalance = useBankBalance()
  const token = "uluna"

  const tokenItem = useTokenItem(token)

  const { data: cw20Balance, ...state } = useTokenBalance(token)
 
  const balance = AccAddress.validate(token)
    ? cw20Balance
    : getAmount(bankBalance, token)


  return (
    <Page  {...state}  title={t("Donation")}>
      <Auto
        columns={[
          <Card>
            <TxContext>
            {tokenItem && balance && <DonationForm {...tokenItem} balance={balance} />} 
            </TxContext>
          </Card>,
          <Card className="none">
            Welcome to Donation
          </Card>,
        ]}
      />     
    </Page>
  )
}

export default Donation
