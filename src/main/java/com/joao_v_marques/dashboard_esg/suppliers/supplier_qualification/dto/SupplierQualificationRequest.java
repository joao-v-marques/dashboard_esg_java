package com.joao_v_marques.dashboard_esg.suppliers.supplier_qualification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record SupplierQualificationRequest(

        @NotNull(message = "Informe o fornecedor.")
        @Positive(message = "Informe um fornecedor válido.")
        Integer supplierId,

        // Preenchido pelo fornecedor
        @NotBlank(message = "Informe o nome do responsável pelas informações.")
        @Size(max = 150, message = "O nome do responsável deve conter no máximo 150 caracteres.")
        String filledByName,

        @NotBlank(message = "Informe o cargo do responsável pelas informações.")
        @Size(max = 100, message = "O cargo do responsável deve conter no máximo 100 caracteres.")
        String filledByPosition,

        @NotNull(message = "Informe a data do preenchimento.")
        LocalDate filledAt,

        // Qualificação
        @NotNull(message = "Informe o resultado da qualificação.")
        @Positive(message = "Informe um resultado válido.")
        Integer resultId,

        // Obrigatório quando o resultado for Aprovado com restrição ou Reprovado (validado no service)
        String resultNotes,

        @NotNull(message = "Informe a data da qualificação.")
        LocalDate qualificationDate,

        // Diretoria
        String boardApprovalNotes
) {
}
