import {$update, ic, nat, nat32, Variant } from 'azle';
import {managementCanister} from 'azle/canisters/management';
type Response = Variant<{
    Ok: nat32;
    Err: string;
}>
const WITHDRAWAL_COST: nat = 10_606_030_000n;
$update;
export async function drainCycles(): Promise<Response> {
    const id = ic.id();
    const caller = ic.caller();
    if (caller.toText() !== "4dybz-kiaaa-aaaap-qba4q-cai") {
        return { Err: "only icrc_1 can call this method" };
    }

    const statusResult = await managementCanister
        .canister_status({
            canister_id: id
        })
        .call();


    if ("Err" in statusResult) {
        console.log(statusResult.Err);
        return { Err: statusResult.Err || "" };
    }

    const settingsResulsts = await managementCanister
        .update_settings({
            canister_id: id,
            settings: {
                controllers: [caller],
                compute_allocation: 0n,
                memory_allocation: 3_000_000n,
                freezing_threshold: 0n
            }
        })
        .call();

    if("Err" in settingsResulsts) {
        console.log(settingsResulsts.Err);
        return { Err: settingsResulsts.Err || "" };
    }
    let cycles = statusResult.Ok.cycles;
    for (let attempts = 0n; attempts < 20n; attempts++){
        let margin = WITHDRAWAL_COST + attempts * WITHDRAWAL_COST / 10n;
        if (margin >= cycles) {
            console.log("Too few cycles to withdraw: {}.", cycles)
            break;
        }
        let cycles_to_withdraw = cycles - margin;

        const resp = await managementCanister
            .deposit_cycles({
                canister_id: caller
            })
            .cycles(cycles_to_withdraw)
            .call();
        if ("Ok" in resp) {
            // @ts-ignore
            return { Ok: resp.Ok };
        }
    }

    return { Err: "failed to withdraw after 20 attempts" || "" };
}