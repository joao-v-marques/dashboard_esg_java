package com.joao_v_marques.dashboard_esg.shared.banks;

import com.joao_v_marques.dashboard_esg.shared.banks.dto.BankRequest;
import com.joao_v_marques.dashboard_esg.shared.banks.dto.BankResponse;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ConflictException;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BankService {

    private final BankRepository repository;

    public BankService(BankRepository repository) {
        this.repository = repository;
    }

    // GET de todos os bancos cadastrados
    @Transactional(readOnly = true)
    public List<BankResponse> findAll() {
        return repository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public BankResponse create(BankRequest request) {
        String code = request.code().trim();
        String name = request.name().trim();

        if (repository.existsByCode(code)) {
            throw new ConflictException("Já existe um banco cadastrado com este código.");
        }

        // Montar entidade com base na dto
        Bank bank = new Bank();
        bank.setCode(code);
        bank.setName(name);

        Bank saved = repository.save(bank);

        return toResponse(saved);
    }

    @Transactional
    public BankResponse update(Integer bankId, BankRequest request) {
        String code = request.code().trim();
        String name = request.name().trim();

        // Valida se o banco editado realmente existe
        Bank bank = repository.findById(bankId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum banco com o ID fornecido."));

        // Validações que a DTO não cobre
        if (!bank.isActive()) {
            throw new IllegalArgumentException("Não é possível editar um banco inativo.");
        }

        if (repository.existsByCodeAndIdNot(code, bankId)) {
            throw new ConflictException("Já existe outro banco cadastrado com este código.");
        }

        // Atualizar a entidade já existente
        bank.setCode(code);
        bank.setName(name);

        return toResponse(bank);
    }

    @Transactional
    public BankResponse deactivate(Integer bankId) {
        // Valida se o banco desativado realmente existe
        Bank bank = repository.findById(bankId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum banco com o ID fornecido."));

        if (!bank.isActive()) {
            throw new IllegalArgumentException("Este banco já está inativo.");
        }

        bank.setActive(false);

        return toResponse(bank);
    }

    @Transactional
    public BankResponse reactivate(Integer bankId) {
        // Valida se o banco reativado realmente existe
        Bank bank = repository.findById(bankId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum banco com o ID fornecido."));

        if (bank.isActive()) {
            throw new IllegalArgumentException("Este banco já está ativo.");
        }

        bank.setActive(true);

        return toResponse(bank);
    }

    private BankResponse toResponse(Bank bank) {
        return new BankResponse(
                bank.getId(),
                bank.getCode(),
                bank.getName(),
                bank.isActive()
        );
    }
}
